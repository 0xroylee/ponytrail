import { availableAgentModels } from "adapters";
import {
	loadInstanceConfig,
	saveInstanceConfig,
} from "devos/features/onboard/instance-config";
import type { OnboardInstanceConfig } from "devos/features/onboard/types/instance-config.types";
import {
	SETTINGS_MODEL_STAGES,
	SETTINGS_REASONING_EFFORTS,
	applySettingsModelStageUpdate,
	findSettingsModelStage,
	isSettingsReasoningEffort,
	pruneEmptyCodexSettings,
} from "./settings-models-config";
import type {
	SettingsModelConfigKey,
	SettingsModelStageUpdate,
	SettingsModelsResponse,
	SettingsModelsUpdateRequest,
} from "./types/settings-models.types";

export class SettingsModelsError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "SettingsModelsError";
	}
}

export async function getSettingsModels(
	cwd: string,
): Promise<SettingsModelsResponse> {
	const config = await readInstanceConfig(cwd);
	return renderSettingsModels(config);
}

export async function updateSettingsModels(
	cwd: string,
	request: unknown,
): Promise<SettingsModelsResponse> {
	validateUpdateRequest(request);
	const config = await readInstanceConfig(cwd);
	config.codex ??= {};
	for (const stage of request.stages) {
		applyStageUpdate(config, stage);
	}
	pruneEmptyCodexSettings(config);
	await saveInstanceConfig(config);
	return renderSettingsModels(config);
}

function renderSettingsModels(
	config: OnboardInstanceConfig,
): SettingsModelsResponse {
	return {
		stages: SETTINGS_MODEL_STAGES.map((stage) => ({
			id: stage.id,
			label: stage.label,
			...(config.codex?.models?.[stage.configKey]
				? { model: config.codex.models[stage.configKey] }
				: {}),
			...(config.codex?.reasoningEfforts?.[stage.configKey]
				? { reasoningEffort: config.codex.reasoningEfforts[stage.configKey] }
				: {}),
		})),
		availableModels: [...availableAgentModels.codex],
		reasoningEfforts: [...SETTINGS_REASONING_EFFORTS],
	};
}

async function readInstanceConfig(cwd: string): Promise<OnboardInstanceConfig> {
	const result = await loadInstanceConfig(cwd);
	if (!result.ok) {
		throw new SettingsModelsError(404, result.message);
	}
	return result.config;
}

function applyStageUpdate(
	config: OnboardInstanceConfig,
	update: SettingsModelStageUpdate,
): void {
	const configKey = resolveConfigKey(update.id);
	applySettingsModelStageUpdate(config, update, configKey);
}

function validateUpdateRequest(
	request: unknown,
): asserts request is SettingsModelsUpdateRequest {
	if (!isRecord(request) || !Array.isArray(request.stages)) {
		throw new SettingsModelsError(400, "settings update requires stages");
	}
	for (const stage of request.stages) {
		if (!isRecord(stage)) {
			throw new SettingsModelsError(400, "settings stage must be an object");
		}
		if (typeof stage.id !== "string") {
			throw new SettingsModelsError(400, "settings stage id must be a string");
		}
		resolveConfigKey(stage.id);
		if (
			stage.model !== undefined &&
			stage.model !== null &&
			typeof stage.model !== "string"
		) {
			throw new SettingsModelsError(400, "settings model must be a string");
		}
		if (
			stage.reasoningEffort !== undefined &&
			stage.reasoningEffort !== null &&
			!isSettingsReasoningEffort(stage.reasoningEffort)
		) {
			throw new SettingsModelsError(400, "invalid reasoning effort");
		}
	}
}

function resolveConfigKey(stageId: string): SettingsModelConfigKey {
	const stage = findSettingsModelStage(stageId);
	if (!stage) {
		throw new SettingsModelsError(400, "unknown settings model stage");
	}
	return stage.configKey;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

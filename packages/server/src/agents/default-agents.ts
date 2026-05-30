import { CODEX_BACKEND, CODEX_DEFAULT_STAGE_MODELS } from "adapters/codex";
import { DEFAULT_REASONING_EFFORTS } from "devos/features/onboard/constants";
import {
	loadInstanceConfig,
	saveInstanceConfig,
} from "devos/features/onboard/instance-config";
import type { OnboardInstanceConfig } from "devos/features/onboard/types/instance-config.types";
import type { AgentUpdatePayload } from "../routes/types/entity-crud.types";
import {
	applySettingsModelStageUpdate,
	findSettingsModelStage,
	pruneEmptyCodexSettings,
} from "../settings/settings-models-config";
import type {
	SettingsModelConfigKey,
	SettingsModelStageId,
	SettingsModelStageUpdate,
} from "../settings/types/settings-models.types";
import type {
	AgentReasoningEffort,
	AgentRecord,
} from "../types/repositories.types";
import type { DefaultAgentDefinition } from "./types/default-agents.types";

const DEFAULT_AGENT_DETAILS: Record<
	SettingsModelStageId,
	Pick<DefaultAgentDefinition, "description" | "instructions">
> = {
	brainstorm: {
		description: "Explores task context and shapes the first workflow plan.",
		instructions: "Clarify intent, constraints, and success criteria.",
	},
	plan: {
		description: "Turns scoped work into an implementation plan.",
		instructions: "Produce a concise plan with verification steps.",
	},
	implement: {
		description: "Applies code changes for approved workflow tasks.",
		instructions: "Make focused edits and keep package boundaries intact.",
	},
	testing: {
		description: "Reviews and validates the completed implementation.",
		instructions: "Run relevant checks and report evidence before completion.",
	},
};

const CONFIG_AGENT_UPDATE_FIELDS = new Set(["model", "reasoningEffort"]);

export class DefaultAgentsError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "DefaultAgentsError";
	}
}

export async function listDefaultAgents(
	workspacePath: string,
): Promise<AgentRecord[]> {
	const config = await readInstanceConfig(workspacePath);
	return defaultAgentDefinitions().map((definition) =>
		renderDefaultAgent(definition, config),
	);
}

export async function getDefaultAgent(
	workspacePath: string,
	id: string,
): Promise<AgentRecord | null> {
	const definition = findDefaultAgentDefinition(id);
	if (!definition) return null;
	return renderDefaultAgent(
		definition,
		await readInstanceConfig(workspacePath),
	);
}

export async function updateDefaultAgent(
	workspacePath: string,
	id: string,
	input: AgentUpdatePayload,
): Promise<AgentRecord | null> {
	const definition = findDefaultAgentDefinition(id);
	if (!definition) return null;
	assertConfigAgentUpdate(input);
	const update = toSettingsUpdate(definition.id, input);
	const config = await readInstanceConfig(workspacePath);
	applySettingsModelStageUpdate(config, update, definition.configKey);
	pruneEmptyCodexSettings(config);
	await saveInstanceConfig(config);
	return renderDefaultAgent(definition, config);
}

async function readInstanceConfig(
	workspacePath: string,
): Promise<OnboardInstanceConfig> {
	const result = await loadInstanceConfig(workspacePath);
	if (!result.ok) {
		throw new DefaultAgentsError(404, result.message);
	}
	return result.config;
}

function defaultAgentDefinitions(): DefaultAgentDefinition[] {
	return ["brainstorm", "plan", "implement", "testing"].map((id) => {
		const stage = findSettingsModelStage(id);
		if (!stage) {
			throw new DefaultAgentsError(500, `Default agent '${id}' is not mapped`);
		}
		return {
			...stage,
			...DEFAULT_AGENT_DETAILS[stage.id],
		};
	});
}

function findDefaultAgentDefinition(
	id: string,
): DefaultAgentDefinition | undefined {
	return defaultAgentDefinitions().find((definition) => definition.id === id);
}

function renderDefaultAgent(
	definition: DefaultAgentDefinition,
	config: OnboardInstanceConfig,
): AgentRecord {
	const updatedAt = config.$meta.updatedAt;
	return {
		id: definition.id,
		name: definition.label,
		description: definition.description,
		logo: "",
		runtime: CODEX_BACKEND,
		backend: CODEX_BACKEND,
		model: modelForStage(definition.configKey, config),
		reasoningEffort: reasoningForStage(definition.configKey, config),
		status: "online",
		concurrency: 1,
		owner: config.workspace.id,
		createdAt: updatedAt,
		updatedAt,
		skills: [],
		recentWork: [],
		activity: [],
		instructions: definition.instructions,
	};
}

function modelForStage(
	configKey: SettingsModelConfigKey,
	config: OnboardInstanceConfig,
): string {
	return (
		config.codex?.models?.[configKey] ??
		CODEX_DEFAULT_STAGE_MODELS[configKey] ??
		"gpt-5.5"
	);
}

function reasoningForStage(
	configKey: SettingsModelConfigKey,
	config: OnboardInstanceConfig,
): AgentReasoningEffort {
	return (
		config.codex?.reasoningEfforts?.[configKey] ??
		DEFAULT_REASONING_EFFORTS[configKey]
	);
}

function assertConfigAgentUpdate(input: AgentUpdatePayload): void {
	const unsupportedFields = Object.keys(input).filter(
		(field) => !CONFIG_AGENT_UPDATE_FIELDS.has(field),
	);
	if (unsupportedFields.length > 0) {
		throw new DefaultAgentsError(
			400,
			"Config-backed agents only support model and reasoningEffort updates",
		);
	}
}

function toSettingsUpdate(
	id: SettingsModelStageId,
	input: AgentUpdatePayload,
): SettingsModelStageUpdate {
	return {
		id,
		...(input.model !== undefined ? { model: input.model } : {}),
		...(input.reasoningEffort !== undefined
			? { reasoningEffort: input.reasoningEffort }
			: {}),
	};
}

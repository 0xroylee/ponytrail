import type { CodexReasoningEffort } from "adapters";
import { normalizeCodexModel } from "adapters/codex";
import type { OnboardInstanceConfig } from "devos/features/onboard/types/instance-config.types";
import type {
	SettingsModelConfigKey,
	SettingsModelStageDefinition,
	SettingsModelStageUpdate,
} from "./types/settings-models.types";

export const SETTINGS_REASONING_EFFORTS = [
	"low",
	"medium",
	"high",
	"xhigh",
] as const satisfies readonly CodexReasoningEffort[];

export const SETTINGS_MODEL_STAGES: SettingsModelStageDefinition[] = [
	{ id: "brainstorm", label: "Brainstorm", configKey: "brainstorm" },
	{ id: "plan", label: "Plan", configKey: "plan" },
	{ id: "implement", label: "Implement", configKey: "implement" },
	{ id: "testing", label: "Testing", configKey: "reviewTest" },
];

export function findSettingsModelStage(
	stageId: string,
): SettingsModelStageDefinition | undefined {
	return SETTINGS_MODEL_STAGES.find((candidate) => candidate.id === stageId);
}

export function applySettingsModelStageUpdate(
	config: OnboardInstanceConfig,
	update: SettingsModelStageUpdate,
	configKey: SettingsModelConfigKey,
): void {
	if ("model" in update) {
		const model = normalizeSettingsModel(update.model);
		config.codex ??= {};
		config.codex.models ??= {};
		if (model) {
			config.codex.models[configKey] = model;
		} else {
			delete config.codex.models[configKey];
		}
	}
	if ("reasoningEffort" in update) {
		config.codex ??= {};
		config.codex.reasoningEfforts ??= {};
		if (update.reasoningEffort) {
			config.codex.reasoningEfforts[configKey] = update.reasoningEffort;
		} else {
			delete config.codex.reasoningEfforts[configKey];
		}
	}
}

export function normalizeSettingsModel(
	value: string | null | undefined,
): string | undefined {
	return typeof value === "string" && value.trim()
		? normalizeCodexModel(value.trim())
		: undefined;
}

export function isSettingsReasoningEffort(
	value: unknown,
): value is CodexReasoningEffort {
	return SETTINGS_REASONING_EFFORTS.includes(value as CodexReasoningEffort);
}

export function pruneEmptyCodexSettings(config: OnboardInstanceConfig): void {
	if (!config.codex) return;
	if (config.codex.models && Object.keys(config.codex.models).length === 0) {
		config.codex.models = undefined;
	}
	if (
		config.codex.reasoningEfforts &&
		Object.keys(config.codex.reasoningEfforts).length === 0
	) {
		config.codex.reasoningEfforts = undefined;
	}
	if (!config.codex.models && !config.codex.reasoningEfforts) {
		config.codex = undefined;
	}
}

import type {
	AgentAdapterRunRole,
	AgentAdapterRuntimeConfig,
	CodexReasoningEffort,
} from "../../../types/agent-adapter.types";
import { normalizeCodexModel } from "../../constants";

export interface CodexStageConfig {
	model?: string;
	reasoningEffort?: CodexReasoningEffort;
	fastModeEnabled?: boolean;
}

export function resolveCodexStageConfig(
	config: AgentAdapterRuntimeConfig,
	role: AgentAdapterRunRole,
): CodexStageConfig {
	if (role === "brainstorm") {
		return {
			model: normalizeCodexModel(
				config.codex.models?.brainstorm ??
					config.codex.models?.plan ??
					config.codex.model,
			),
			reasoningEffort:
				config.codex.reasoningEfforts?.brainstorm ??
				config.codex.reasoningEfforts?.plan ??
				config.codex.reasoningEffort,
			fastModeEnabled:
				config.codex.fastModes?.brainstorm ?? config.codex.fastModes?.plan,
		};
	}
	if (role === "planning" || role === "task-intake") {
		return {
			model: normalizeCodexModel(
				config.codex.models?.plan ?? config.codex.model,
			),
			reasoningEffort:
				config.codex.reasoningEfforts?.plan ?? config.codex.reasoningEffort,
			fastModeEnabled: config.codex.fastModes?.plan,
		};
	}
	if (role === "implementing") {
		return {
			model: normalizeCodexModel(
				config.codex.models?.implement ?? config.codex.model,
			),
			reasoningEffort:
				config.codex.reasoningEfforts?.implement ??
				config.codex.reasoningEffort,
			fastModeEnabled: config.codex.fastModes?.implement,
		};
	}
	if (role === "review-testing") {
		return {
			model: normalizeCodexModel(
				config.codex.models?.reviewTest ??
					config.codex.models?.implement ??
					config.codex.model,
			),
			reasoningEffort:
				config.codex.reasoningEfforts?.reviewTest ??
				config.codex.reasoningEfforts?.implement ??
				config.codex.reasoningEffort,
			fastModeEnabled:
				config.codex.fastModes?.reviewTest ?? config.codex.fastModes?.implement,
		};
	}
	return {
		model: normalizeCodexModel(
			config.codex.models?.githubComment ??
				config.codex.models?.reviewTest ??
				config.codex.models?.implement ??
				config.codex.model,
		),
		reasoningEffort:
			config.codex.reasoningEfforts?.githubComment ??
			config.codex.reasoningEfforts?.reviewTest ??
			config.codex.reasoningEfforts?.implement ??
			config.codex.reasoningEffort,
		fastModeEnabled:
			config.codex.fastModes?.githubComment ??
			config.codex.fastModes?.reviewTest ??
			config.codex.fastModes?.implement,
	};
}

import { getAgentBackendDefinition } from "./registry";
import type {
	AgentAdapter,
	AgentAdapterRuntimeConfig,
	AgentBackend,
	AgentResult,
} from "./types/agent-adapter.types";

export type {
	AgentAdapter,
	AgentAdapterRuntimeConfig,
	AgentBackend,
	AgentResult,
	CodexReasoningEffort,
} from "./types/agent-adapter.types";
export type {
	AgentBackendDefinition,
	AgentConfigurationDoc,
	AgentConfigurationDocField,
	AgentConfigurationInput,
	AgentConfigurationResolveOptions,
	AgentModelDefinition,
	AgentStage,
	ResolvedAgentConfiguration,
} from "./types/agent-registry.types";
export {
	agentConfigurationDoc,
	availableAgentModels,
	getAgentBackendDefinition,
	listAgentBackends,
	normalizeAgentBackend,
	resolveAgentConfiguration,
} from "./registry";
export { assertCommandOk, runCommand } from "./shell";
export type { CommandResult, RunCommandOptions } from "./shell";

export function createAgentAdapter(
	config: AgentAdapterRuntimeConfig,
	backend?: AgentBackend,
): AgentAdapter {
	const requestedBackend = backend ?? config.agent?.backend ?? "codex";
	const definition = getAgentBackendDefinition(requestedBackend);
	if (!definition) {
		throw new Error(`Unknown agent backend: ${requestedBackend}`);
	}
	return definition.createAdapter(config);
}

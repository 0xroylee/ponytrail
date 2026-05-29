import type { LoadedConfig } from "../../config";
import type { ResolvedProjectConfig, RunOptions } from "../../types";
import type {
	PollingSettings,
	WorkflowRuntime,
	WorkflowTaskClient,
} from "./workflow.types";

export interface ProjectWorkflowContext<
	TProject extends ResolvedProjectConfig = ResolvedProjectConfig,
> {
	config: TProject;
	taskClient: WorkflowTaskClient;
}

export interface ProjectContextResolverDeps<
	TProject extends ResolvedProjectConfig,
> {
	pickProjects(
		config: LoadedConfig,
		options: RunOptions,
		polling: PollingSettings,
	): TProject[];
	usesAllProjectScope(options: RunOptions, polling: PollingSettings): boolean;
	routeProjectContextsForTargetIssue(
		contexts: Array<ProjectWorkflowContext<TProject>>,
		issueArg: string,
	): Promise<Array<ProjectWorkflowContext<TProject>>>;
	handleNoProjectSelection(
		polling: PollingSettings,
		options: RunOptions,
		runtime: WorkflowRuntime,
	): Promise<void>;
}

export interface WorkflowSchedulerDeps<TProject extends ResolvedProjectConfig> {
	runProjectCycle(input: {
		project: TProject;
		taskClient: WorkflowTaskClient;
		cycle: number;
		polling: PollingSettings;
	}): Promise<number>;
	handleProjectCycleError(input: {
		error: unknown;
		project: TProject;
		cycle: number;
		polling: PollingSettings;
	}): Promise<void>;
	shouldStopPolling(input: {
		polling: PollingSettings;
		options: RunOptions;
		cycle: number;
		totalIssues: number;
		cycleHadError: boolean;
	}): boolean;
	handlePollingStopped(input: {
		contexts: Array<ProjectWorkflowContext<TProject>>;
		polling: PollingSettings;
		cycle: number;
		totalIssues: number;
		cycleHadError: boolean;
	}): Promise<void>;
	sleepForWorkflow(runtime: WorkflowRuntime, ms: number): Promise<void>;
}

export interface WorkflowManagerDeps<TProject extends ResolvedProjectConfig>
	extends ProjectContextResolverDeps<TProject>,
		WorkflowSchedulerDeps<TProject> {
	resolvePolling(config: LoadedConfig, options: RunOptions): PollingSettings;
}

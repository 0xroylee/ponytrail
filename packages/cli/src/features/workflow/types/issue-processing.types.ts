import type {
	ResolvedNotificationConfig,
	ResolvedProjectConfig,
	RunOptions,
	RunState,
} from "../../types";
import type {
	WorkflowIssue,
	WorkflowRuntime,
	WorkflowTaskClient,
} from "./workflow.types";

export interface IssueRunStateResolution {
	runState: RunState;
	existing: RunState | null;
	isCanceledState: boolean;
}

export interface IssueLogger {
	info(input: unknown, message?: string): void;
	warn(input: unknown, message?: string): void;
	error(input: unknown, message?: string): void;
}

export interface IssueProcessorInput {
	config: ResolvedProjectConfig;
	notifications: ResolvedNotificationConfig;
	taskClient: WorkflowTaskClient;
	options: RunOptions;
	effectiveConcurrency: number;
	leaseTimeoutMs: number;
	leaseOwnerId: string;
	runtime: WorkflowRuntime;
}

export interface IssueProcessorDeps {
	process(issue: WorkflowIssue): Promise<void>;
}

import type { ResolvedProjectConfig, RunOptions, RunState } from "../../types";
import type {
	PollingSettings,
	WorkflowIssue,
	WorkflowTaskClient,
} from "./workflow.types";

export interface Mission {
	id: string;
	key: string;
	projectId: string;
	issue: WorkflowIssue;
	state: RunState;
	resumed: boolean;
}

export interface MissionCycleInput {
	project: ResolvedProjectConfig;
	taskClient: WorkflowTaskClient;
	options: RunOptions;
	polling: PollingSettings;
}

export interface MissionQueue {
	issues: WorkflowIssue[];
	staleRetryCount: number;
}

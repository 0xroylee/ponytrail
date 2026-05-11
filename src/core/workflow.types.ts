import type { PullRequestRef, RunState } from "./types";

export interface WorkflowIssue {
	id: string;
	identifier: string;
	title: string;
	description?: string;
	url: string;
	projectId?: string;
	teamId?: string;
	creatorId?: string;
	assigneeId?: string;
	priority: {
		value: number;
		name: string;
	};
	labels: Array<{
		id: string;
		name: string;
	}>;
	state: {
		id: string;
		name: string;
	};
	pullRequest?: PullRequestRef;
}

export interface PollingSettings {
	enabled: boolean;
	intervalMs: number;
	maxCycles?: number;
	exitWhenIdle: boolean;
	staleRunTimeoutMs: number;
}

export interface IssueProjectRoutingResult {
	selectedProjectId?: string;
	skipReason?: string;
	error?: string;
}

export interface ReviewOnlyQueueBuildResult {
	issueQueue: WorkflowIssue[];
	mergedCandidateCount: number;
	discoveredPrCount: number;
	skippedWithoutPr: number;
}

export interface IssueJobLogFields {
	projectId: string;
	issueKey: string;
	issueId: string;
	issueTitle: string;
	stage: string;
	resumed?: true;
}

export interface ReviewOnlyQueueInput {
	runStates: RunState[];
	localIssues: WorkflowIssue[];
	linearIssues: WorkflowIssue[];
	discoveredPullRequestsByIssueKey: Map<string, PullRequestRef | undefined>;
}

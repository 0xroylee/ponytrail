import type { AgentAdapter } from "adapters";
import type { RemoveWorktreeResult } from "../../../integrations/github";
import type {
	CreatedTaskRef,
	ParentIssueRef,
	PlannedSplitTask,
	PullRequestRef,
	ResolvedNotificationEmailConfig,
	ResolvedProjectConfig,
	RunState,
	WorkflowStage,
} from "../../types";

export interface WorkflowIssue {
	id: string;
	identifier: string;
	branchName?: string;
	title: string;
	description?: string;
	url: string;
	projectId?: string;
	teamId?: string;
	creatorId?: string;
	assigneeId?: string;
	parentIssue?: ParentIssueRef;
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

export interface PollingSettings {
	enabled: boolean;
	intervalMs: number;
	maxCycles?: number;
	exitWhenIdle: boolean;
	staleRunTimeoutMs: number;
}

export interface IssueJobLogFields {
	projectId: string;
	issueKey: string;
	issueId: string;
	issueTitle: string;
	stage: string;
	resumed?: true;
}

export interface WorkflowFetchWorkOptions {
	includeUnprojected?: boolean;
}

export interface WorkflowTaskClient {
	fetchWork(
		issueArg?: string,
		options?: WorkflowFetchWorkOptions,
	): Promise<WorkflowIssue[]>;
	fetchIssueByIdentifier(issueArg: string): Promise<WorkflowIssue | null>;
	fetchReviewOnlyWork(): Promise<WorkflowIssue[]>;
	isAssignedState(stateId: string): Promise<boolean>;
	markStage(issueId: string, stage: WorkflowStage): Promise<void>;
	markCanceled(issueId: string): Promise<void>;
	createBacklogTask(input: {
		title: string;
		description: string;
	}): Promise<CreatedTaskRef>;
	createTodoIssueFromPlan(
		parentIssue: ParentIssueRef,
		task: PlannedSplitTask,
	): Promise<CreatedTaskRef>;
	applyStageLabel(issueId: string, stage: WorkflowStage): Promise<void>;
	clearWorkflowStageLabels(issueId: string): Promise<void>;
	comment(issueId: string, body: string): Promise<void>;
	linkPullRequest?(issueId: string, pullRequest: PullRequestRef): Promise<void>;
}

export interface WorkflowRuntime {
	sleep?(ms: number): Promise<void>;
	createTaskClient(config: ResolvedProjectConfig): WorkflowTaskClient;
	createAgentAdapter(config: ResolvedProjectConfig): AgentAdapter;
	ensureBaseBranchFresh(config: ResolvedProjectConfig): Promise<void>;
	ensureIssueWorktree(
		config: ResolvedProjectConfig,
		issueKey: string,
		pullRequest: PullRequestRef | undefined,
		worktreePath: string,
		branchName?: string,
	): Promise<string>;
	prepareWorktreeDependencies(worktreePath: string): Promise<void>;
	removeIssueWorktree(
		config: ResolvedProjectConfig,
		worktreePath: string,
	): Promise<RemoveWorktreeResult>;
	findOpenPullRequestForIssue(
		config: ResolvedProjectConfig,
		issueKey: string,
		branchName?: string,
	): Promise<PullRequestRef | undefined>;
	getPullRequestMergeStatus(
		config: ResolvedProjectConfig,
		pr: PullRequestRef,
	): Promise<{ mergeStateStatus?: string; mergeable?: string }>;
	prepareImplementationBranch(
		config: ResolvedProjectConfig,
		issueKey: string,
		pullRequest: PullRequestRef | undefined,
		branchName?: string,
	): Promise<string>;
	createDraftPrFromWorktree(
		config: ResolvedProjectConfig,
		issueKey: string,
		issueTitle: string,
		branchName?: string,
	): Promise<PullRequestRef>;
	updateDraftPrFromWorktree(
		config: ResolvedProjectConfig,
		prBranch: string,
		issueKey: string,
	): Promise<boolean>;
	commentOnPr(
		config: ResolvedProjectConfig,
		pr: PullRequestRef,
		body: string,
	): Promise<void>;
	markPrReadyForReview(
		config: ResolvedProjectConfig,
		pr: PullRequestRef,
	): Promise<boolean>;
	squashMergePullRequest(
		config: ResolvedProjectConfig,
		pr: PullRequestRef,
	): Promise<boolean>;
	sendTaskOutcomeEmail(
		email: ResolvedNotificationEmailConfig,
		state: RunState,
		outcome: "done" | "canceled" | "failed",
		errorMessage?: string,
	): Promise<void>;
	sendHumanReviewRequiredEmail(
		email: ResolvedNotificationEmailConfig,
		state: RunState,
		input: { complexityScore: number; reason: string },
	): Promise<void>;
}

export interface ReviewOnlyQueueInput {
	runStates: RunState[];
	localIssues: WorkflowIssue[];
	taskIssues: WorkflowIssue[];
	discoveredPullRequestsByIssueKey: Map<string, PullRequestRef | undefined>;
}

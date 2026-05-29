import type {
	ResolvedNotificationConfig,
	ResolvedProjectConfig,
	RunState,
} from "../../types";
import type {
	FinalizeReviewMergeDeps,
	ReviewTaskClient,
} from "../types/review-stage.types";

export async function finalizeIssueAfterReviewMerge(
	config: ResolvedProjectConfig,
	notifications: ResolvedNotificationConfig,
	taskClient: ReviewTaskClient,
	state: RunState,
	deps: FinalizeReviewMergeDeps,
): Promise<void> {
	await taskClient.markStage(state.issue.id, "done");
	await taskClient.clearWorkflowStageLabels(state.issue.id);
	await taskClient.comment(
		state.issue.id,
		"PR squash-merged after completed review.",
	);
	state.pullRequestApprovedAt = new Date().toISOString();
	await deps.saveRunState(config.workspacePath, state);
	await deps.safeNotifyTaskOutcome(notifications, state, "done");
}

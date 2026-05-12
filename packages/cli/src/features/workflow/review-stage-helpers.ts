import type { ResolvedProjectConfig, RunState } from "../../core/types";
import { markPrReadyForReview } from "../../integrations/github";
import type { ReviewOutcome } from "./review";

export function resolveReviewFailureStage(
	state: Pick<RunState, "codexSessionId">,
): Extract<RunState["stage"], "implementing" | "human_review"> {
	return state.codexSessionId ? "implementing" : "human_review";
}

export function normalizeFailedReviewBugs(
	outcome: ReviewOutcome,
): RunState["bugs"] {
	if (outcome.passed) {
		return [];
	}
	if (outcome.bugs.length > 0) {
		return outcome.bugs;
	}
	const summary =
		outcome.summary.trim() ||
		"Review/testing failed but no structured BUGS_JSON details were provided.";
	return [
		{
			title: "Review/testing failed without structured bug details",
			body: summary,
		},
	];
}

export async function readyPullRequestAfterPassingReview(
	config: ResolvedProjectConfig,
	pullRequest: RunState["pullRequest"],
	passed: boolean,
	deps?: {
		markPrReadyForReview?: typeof markPrReadyForReview;
	},
): Promise<boolean> {
	if (!passed || config.dryRun || !pullRequest) {
		return false;
	}
	const markReady = deps?.markPrReadyForReview ?? markPrReadyForReview;
	return markReady(config, pullRequest);
}

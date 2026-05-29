import type { WorkflowIssue } from "./types/workflow.types";

const CANCELED_STATUS = "canceled";

export function matchesIssueStateValue(
	state: WorkflowIssue["state"],
	expectedValue: string,
): boolean {
	const expected = expectedValue.trim().toLowerCase();
	if (!expected) {
		return false;
	}
	return (
		state.id.toLowerCase() === expected || state.name.toLowerCase() === expected
	);
}

export function isCanceledWorkflowIssueState(
	state: WorkflowIssue["state"],
): boolean {
	return matchesIssueStateValue(state, CANCELED_STATUS);
}

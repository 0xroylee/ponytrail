import type { ResolvedProjectConfig } from "../types";
import type { WorkflowIssue } from "./types/workflow.types";

export function matchesIssueStateConfigValue(
	state: WorkflowIssue["state"],
	configValue: string,
): boolean {
	const expected = configValue.trim().toLowerCase();
	if (!expected) {
		return false;
	}
	return (
		state.id.toLowerCase() === expected || state.name.toLowerCase() === expected
	);
}

export function isBlockedLinearIssueState(
	state: WorkflowIssue["state"],
	statusMap: ResolvedProjectConfig["linear"]["statusMap"],
): boolean {
	return matchesIssueStateConfigValue(state, statusMap.blocked);
}

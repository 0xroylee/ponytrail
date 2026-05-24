import type { RunState } from "../../features/types";
import type { WorkflowIssue } from "./workflow.types";

export interface RunStateIssueIdentityRefresh {
	changed: boolean;
	previousIssueId: string;
	currentIssueId: string;
}

type RunStateIssueIdentityField =
	| "id"
	| "title"
	| "description"
	| "url"
	| "projectId"
	| "teamId"
	| "creatorId"
	| "assigneeId"
	| "parentIssue";

const ISSUE_IDENTITY_FIELDS: RunStateIssueIdentityField[] = [
	"id",
	"title",
	"description",
	"url",
	"projectId",
	"teamId",
	"creatorId",
	"assigneeId",
	"parentIssue",
];

export function refreshRunStateIssueIdentity(
	state: RunState,
	issue: WorkflowIssue,
): RunStateIssueIdentityRefresh {
	const previousIssueId = state.issue.id;
	const nextIdentity = {
		id: issue.id,
		title: issue.title,
		description: issue.description,
		url: issue.url,
		projectId: issue.projectId,
		teamId: issue.teamId,
		creatorId: issue.creatorId,
		assigneeId: issue.assigneeId,
		parentIssue: issue.parentIssue,
	};
	const changed = ISSUE_IDENTITY_FIELDS.some(
		(field) => !sameValue(state.issue[field], nextIdentity[field]),
	);
	if (changed) {
		Object.assign(state.issue, nextIdentity);
	}
	return {
		changed,
		previousIssueId,
		currentIssueId: state.issue.id,
	};
}

function sameValue(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

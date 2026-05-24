import { describe, expect, it } from "bun:test";
import type { RunState } from "../src/features/types";
import { refreshRunStateIssueIdentity } from "../src/features/workflow/workflow-run-state-refresh";
import type { WorkflowIssue } from "../src/features/workflow/workflow.types";

describe("workflow run-state identity refresh", () => {
	it("refreshes server-owned issue identity without resetting workflow progress", () => {
		const state = createRunState();
		const refreshed = refreshRunStateIssueIdentity(state, {
			id: "current-task-id",
			identifier: "TASK-000001",
			title: "Current title",
			description: "Current content",
			url: "devos://tasks/current-task-id",
			projectId: "default",
			teamId: "team-1",
			creatorId: "member-1",
			assigneeId: "member-2",
			parentIssue: {
				id: "parent-1",
				key: "TASK-000000",
				title: "Parent",
				url: "devos://tasks/parent-1",
			},
			priority: { value: 1, name: "P1" },
			labels: [],
			state: { id: "todo", name: "Todo" },
			pullRequest: {
				number: 7,
				url: "https://github.com/acme/repo/pull/7",
				branch: "codex/task-000001",
				title: "Existing PR",
			},
		});

		expect(refreshed).toEqual({
			changed: true,
			previousIssueId: "stale-task-id",
			currentIssueId: "current-task-id",
		});
		expect(state.issue).toMatchObject({
			id: "current-task-id",
			key: "TASK-000001",
			title: "Current title",
			description: "Current content",
			url: "devos://tasks/current-task-id",
			projectId: "default",
			teamId: "team-1",
			creatorId: "member-1",
			assigneeId: "member-2",
			parentIssue: {
				id: "parent-1",
				key: "TASK-000000",
			},
		});
		expect(state.stage).toBe("implementing");
		expect(state.planSummary).toBe("keep the plan");
		expect(state.pullRequest?.url).toBe("https://github.com/acme/repo/pull/7");
		expect(state.startedAt).toBe("2026-05-13T00:00:00.000Z");
	});

	it("reports unchanged identity without mutating the run state", () => {
		const state = createRunState();
		const snapshot = JSON.stringify(state);
		const refreshed = refreshRunStateIssueIdentity(
			state,
			createWorkflowIssueFromState(state),
		);

		expect(refreshed).toEqual({
			changed: false,
			previousIssueId: "stale-task-id",
			currentIssueId: "stale-task-id",
		});
		expect(JSON.stringify(state)).toBe(snapshot);
	});
});

function createRunState(): RunState {
	return {
		projectId: "default",
		projectName: "Default",
		workspacePath: "/repo",
		repository: {
			owner: "acme",
			name: "repo",
			baseBranch: "main",
		},
		issue: {
			id: "stale-task-id",
			key: "TASK-000001",
			title: "Old title",
			description: "Old content",
			url: "devos://tasks/stale-task-id",
			projectId: "default",
		},
		stage: "implementing",
		pullRequest: {
			number: 7,
			url: "https://github.com/acme/repo/pull/7",
			branch: "codex/task-000001",
			title: "Existing PR",
		},
		bugs: [],
		planSummary: "keep the plan",
		startedAt: "2026-05-13T00:00:00.000Z",
		updatedAt: "2026-05-13T00:01:00.000Z",
	};
}

function createWorkflowIssueFromState(state: RunState): WorkflowIssue {
	return {
		id: state.issue.id,
		identifier: state.issue.key,
		title: state.issue.title,
		description: state.issue.description,
		url: state.issue.url,
		projectId: state.issue.projectId,
		teamId: state.issue.teamId,
		creatorId: state.issue.creatorId,
		assigneeId: state.issue.assigneeId,
		parentIssue: state.issue.parentIssue,
		priority: { value: 1, name: "P1" },
		labels: [],
		state: { id: "todo", name: "Todo" },
	};
}

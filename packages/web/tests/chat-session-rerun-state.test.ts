import { describe, expect, it } from "bun:test";

import { resolveChatSessionRerunState } from "../src/components/chat-room/chat-session-rerun-state";
import type { ChatSessionRecord, ProjectBoardTaskRecord } from "../src/lib/api";

describe("chat session rerun state", () => {
	it("builds a workflow run command for failed sessions with linked tasks", () => {
		const state = resolveChatSessionRerunState({
			isBusy: false,
			session: chatSession({ workflowState: "failed" }),
			task: boardTask({ projectId: "default", taskKey: "WOR-53" }),
		});

		expect(state).toEqual({
			command: { action: "run", issueKey: "WOR-53", projectId: "default" },
			isDisabled: false,
			isVisible: true,
		});
	});

	it("hides the rerun action when the active session is not failed", () => {
		const state = resolveChatSessionRerunState({
			isBusy: false,
			session: chatSession({ workflowState: "testing" }),
			task: boardTask(),
		});

		expect(state).toEqual({
			command: null,
			isDisabled: true,
			isVisible: false,
		});
	});

	it("keeps failed sessions visible but disabled until rerun input is ready", () => {
		const state = resolveChatSessionRerunState({
			isBusy: true,
			session: chatSession({ workflowState: "failed" }),
			task: boardTask({ projectId: null }),
		});

		expect(state).toEqual({
			command: null,
			isDisabled: true,
			isVisible: true,
		});
	});

	it("keeps failed sessions disabled after a rerun is submitted", () => {
		const state = resolveChatSessionRerunState({
			hasSubmittedRerun: true,
			isBusy: false,
			session: chatSession({ workflowState: "failed" }),
			task: boardTask({ projectId: "default", taskKey: "WOR-53" }),
		});

		expect(state).toEqual({
			command: null,
			isDisabled: true,
			isVisible: true,
		});
	});

	it("falls back to the session project when the task project is missing", () => {
		const state = resolveChatSessionRerunState({
			isBusy: false,
			session: chatSession({ projectId: "default", workflowState: "failed" }),
			task: boardTask({ projectId: null, taskKey: "WOR-54" }),
		});

		expect(state.command).toEqual({
			action: "run",
			issueKey: "WOR-54",
			projectId: "default",
		});
	});
});

function chatSession(
	overrides: Partial<ChatSessionRecord> = {},
): ChatSessionRecord {
	return {
		archived: false,
		createdAt: "2026-06-05T00:00:00.000Z",
		id: "session-1",
		pendingQuestions: [],
		pendingRequest: null,
		projectId: "default",
		taskId: "task-1",
		title: "Failed session",
		updatedAt: "2026-06-05T00:00:00.000Z",
		workflowState: "failed",
		workspaceId: "workspace-1",
		...overrides,
	};
}

function boardTask(
	overrides: Partial<ProjectBoardTaskRecord> = {},
): ProjectBoardTaskRecord {
	return {
		assigneeId: null,
		content: "Run the workflow again.",
		createdAt: "2026-06-05T00:00:00.000Z",
		creatorId: "user-1",
		dueDate: null,
		id: "task-1",
		linkedPr: null,
		priority: 0,
		projectId: "default",
		status: "failed",
		taskKey: "WOR-53",
		title: "Retry workflow",
		updatedAt: "2026-06-05T00:00:00.000Z",
		...overrides,
	};
}

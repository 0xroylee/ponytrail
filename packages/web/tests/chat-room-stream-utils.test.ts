import { describe, expect, it } from "bun:test";
import { activeChatStreamSessionIds } from "../src/components/chat-room/chat-room-stream-utils";
import type { ChatSessionRecord, ProjectBoardTaskRecord } from "../src/lib/api";
import type { RealtimeChatStreamBuffer } from "../src/lib/realtime/types/realtime-store.types";

describe("chat room stream utilities", () => {
	it("returns session ids with active chat streams", () => {
		const sessionIds = activeChatStreamSessionIds({
			"run-1": chatStream({ runId: "run-1", sessionId: "session-1" }),
			"run-2": chatStream({
				runId: "run-2",
				sessionId: "session-2",
				status: "streaming",
			}),
			"run-3": chatStream({
				runId: "run-3",
				sessionId: "session-1",
				status: "completed",
			}),
			"run-4": chatStream({
				runId: "run-4",
				sessionId: "session-3",
				status: "error",
			}),
		});

		expect([...sessionIds]).toEqual(["session-1", "session-2"]);
	});

	it("returns no running sessions without active websocket streams", () => {
		const sessionIds = activeChatStreamSessionIds({});
		expect([...sessionIds]).toEqual([]);
	});

	it("includes sessions linked to planning tasks", () => {
		const sessionIds = activeChatStreamSessionIds(
			{},
			[
				chatSession({
					id: "6591ae97-34a8-44d8-a2fc-17ef5afe9da0",
					taskId: "task-planning",
				}),
				chatSession({ id: "session-idle", taskId: "task-idle" }),
				chatSession({ id: "session-no-task", taskId: null }),
			],
			[
				boardTask({ id: "task-planning", status: "planning" }),
				boardTask({ id: "task-idle", status: "backlog" }),
			],
		);

		expect([...sessionIds]).toEqual(["6591ae97-34a8-44d8-a2fc-17ef5afe9da0"]);
	});

	it("drives persisted loading sessions from task status instead of workflow state", () => {
		const sessionIds = activeChatStreamSessionIds(
			{},
			[
				chatSessionWithWorkflowState("session-plan", "plan", {
					taskId: "task-plan",
				}),
				chatSessionWithWorkflowState("session-testing", "testing", {
					taskId: "task-in-review",
				}),
				chatSessionWithWorkflowState("session-done", "done"),
				chatSessionWithWorkflowState("session-done-planning", "done", {
					taskId: "task-planning",
				}),
				chatSessionWithWorkflowState("session-failed", "failed"),
				chatSessionWithWorkflowState("session-canceled", "canceled"),
			],
			[
				boardTask({ id: "task-plan", status: "plan" }),
				boardTask({ id: "task-in-review", status: "in_review" }),
				boardTask({ id: "task-planning", status: "planning" }),
			],
		);

		expect([...sessionIds]).toEqual(["session-plan", "session-done-planning"]);
	});

	it("does not mark backlog-derived brainstorm sessions as running", () => {
		const sessionIds = activeChatStreamSessionIds(
			{},
			[
				chatSessionWithWorkflowState(
					"49c9c388-aea7-435a-9a40-c01c38fe6e62",
					"brainstorm",
					{ taskId: "518d6732-720b-4ece-8d58-45c86b03f403" },
				),
			],
			[
				boardTask({
					id: "518d6732-720b-4ece-8d58-45c86b03f403",
					status: "backlog",
				}),
			],
		);

		expect([...sessionIds]).toEqual([]);
	});
});

function chatStream(
	overrides: Partial<RealtimeChatStreamBuffer> = {},
): RealtimeChatStreamBuffer {
	return {
		runId: "run-1",
		sessionId: "session-1",
		userMessageId: "message-user",
		content: "",
		status: "loading",
		error: null,
		completedMessageId: null,
		startedAt: "2026-05-16T00:00:00.000Z",
		updatedAt: "2026-05-16T00:00:00.000Z",
		...overrides,
	};
}

function chatSession(
	overrides: Partial<ChatSessionRecord> = {},
): ChatSessionRecord {
	return {
		id: "session-1",
		workspaceId: "workspace-1",
		projectId: "default",
		taskId: null,
		title: "Untitled",
		pendingRequest: null,
		pendingQuestions: [],
		archived: false,
		workflowState: null,
		createdAt: "2026-05-16T00:00:00.000Z",
		updatedAt: "2026-05-16T00:00:00.000Z",
		...overrides,
	};
}

function chatSessionWithWorkflowState(
	id: string,
	workflowState: string,
	overrides: Partial<ChatSessionRecord> = {},
): ChatSessionRecord {
	return {
		...chatSession({ id, ...overrides }),
		workflowState,
	} as ChatSessionRecord;
}

function boardTask(
	overrides: Partial<ProjectBoardTaskRecord> = {},
): ProjectBoardTaskRecord {
	return {
		id: "task-1",
		taskKey: "ENG-1",
		projectId: "default",
		title: "Task",
		content: "Task content",
		priority: 1,
		status: "backlog",
		dueDate: null,
		creatorId: "workspace-1",
		assigneeId: null,
		linkedPr: null,
		createdAt: "2026-05-16T00:00:00.000Z",
		updatedAt: "2026-05-16T00:00:00.000Z",
		...overrides,
	};
}

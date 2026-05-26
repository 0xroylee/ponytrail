import { describe, expect, it } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatClarificationComposer } from "../src/components/chat-room/chat-clarification-composer";
import { resolveClarificationAnswerAction } from "../src/components/chat-room/chat-clarification-state";
import { ChatRoomPanelView } from "../src/components/chat-room/chat-room-panel-view";
import { ChatTaskDetailPanel } from "../src/components/chat-room/chat-task-detail-sheet";
import { TaskCreateClarificationStep } from "../src/components/task-create/task-create-clarification-step";
import type { ChatSessionRecord, ProjectBoardTaskRecord } from "../src/lib/api";
import { serverStateQueryKeys } from "../src/lib/api/query-keys";

describe("chat clarification composer", () => {
	it("renders clarification controls in the composer slot shape", () => {
		const html = renderToStaticMarkup(
			createElement(ChatClarificationComposer, {
				answers: [],
				disabled: false,
				pendingQuestionIndex: 0,
				questions: [
					{
						question: "Which agent?",
						options: [
							{ label: "Codex", value: "codex", recommended: true },
							{ label: "Claude", value: "claude" },
						],
					},
				],
				onAnswerChange: () => undefined,
				onSelectOption: () => undefined,
				onSubmit: () => undefined,
			}),
		);

		expect(html).toContain("Which agent?");
		expect(html).toContain("Codex");
		expect(html).toContain("Recommended");
		expect(html).toContain("Type a custom answer");
		expect(html).toContain("Submit");
		expect(html).not.toContain('value="codex"');
		expect(html).not.toContain("Message or /command");
	});

	it("renders next for non-final clarification steps", () => {
		const html = renderToStaticMarkup(
			createElement(ChatClarificationComposer, {
				answers: ["codex"],
				disabled: false,
				pendingQuestionIndex: 0,
				questions: [{ question: "Which agent?" }, { question: "What scope?" }],
				onAnswerChange: () => undefined,
				onSelectOption: () => undefined,
				onSubmit: () => undefined,
			}),
		);

		expect(html).toContain("Which agent?");
		expect(html).toContain("Next");
		expect(html).not.toContain("What scope?");
	});

	it("renders recommended task-create clarification options", () => {
		const html = renderToStaticMarkup(
			createElement(TaskCreateClarificationStep, {
				answer: "",
				currentIndex: 0,
				question: {
					question: "Which agent?",
					options: [
						{ label: "Codex", value: "codex", recommended: true },
						{ label: "Claude", value: "claude" },
					],
				},
				onAnswerChange: () => undefined,
			}),
		);

		expect(html).toContain("Which agent?");
		expect(html).toContain("Codex");
		expect(html).toContain("Recommended");
	});

	it("resolves option clicks as immediate advance or submit actions", () => {
		const questions = [
			{
				question: "Which agent?",
				options: [{ label: "Codex", value: "codex" }],
			},
			{
				question: "What scope?",
				options: [{ label: "Web", value: "web" }],
			},
		];

		expect(
			resolveClarificationAnswerAction({
				answerValue: "codex",
				pendingAnswers: [],
				pendingQuestionIndex: 0,
				questions,
			}),
		).toEqual({
			answerDrafts: ["codex"],
			kind: "advance",
			nextQuestionIndex: 1,
		});
		expect(
			resolveClarificationAnswerAction({
				answerValue: "web",
				pendingAnswers: ["codex"],
				pendingQuestionIndex: 1,
				questions,
			}),
		).toEqual({
			answerDrafts: ["codex", "web"],
			answers: [
				{ question: "Which agent?", answer: "codex" },
				{ question: "What scope?", answer: "web" },
			],
			content: "codex\nweb",
			kind: "submit",
		});
	});

	it("replaces the normal composer in the chat panel footer", () => {
		const session = chatSession({
			pendingQuestions: [{ question: "Implement this plan?" }],
		});
		const queryClient = new QueryClient();
		const html = renderToStaticMarkup(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(ChatRoomPanelView, {
					activeSessionId: session.id,
					activeTaskId: null,
					draft: "",
					isBusy: false,
					isCreatingSession: false,
					isMessagesLoading: false,
					isSending: false,
					isTaskDetailPanelOpen: false,
					isThinking: false,
					messages: [],
					messagesError: null,
					pendingAnswers: [],
					pendingQuestionIndex: 0,
					projects: [],
					selectedSession: session,
					sidebarControlId: "chat-sidebar-toggle-test",
					sidebarToggleRef: createRef<HTMLInputElement>(),
					sessions: [session],
					streamLines: [],
					onAnswerChange: () => undefined,
					onArchiveSession: () => undefined,
					onCloseSidebar: () => undefined,
					onCloseTaskDetails: () => undefined,
					onDraftChange: () => undefined,
					onNewSession: () => undefined,
					onToggleTaskDetails: () => undefined,
					onSearch: () => undefined,
					onSelectCommand: () => undefined,
					onSelectOption: () => undefined,
					onSelectSession: () => undefined,
					onSubmit: () => undefined,
					onSubmitAnswers: () => undefined,
				}),
			),
		);

		expect(html).toContain("Implement this plan?");
		expect(html).toContain("Type a custom answer");
		expect(html).not.toContain("Message or /command");
	});

	it("renders the no-session welcome state until a session is selected", () => {
		const session = chatSession();
		const queryClient = new QueryClient();
		const html = renderToStaticMarkup(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(ChatRoomPanelView, {
					activeSessionId: "",
					activeTaskId: null,
					draft: "",
					isBusy: false,
					isCreatingSession: false,
					isMessagesLoading: false,
					isSending: false,
					isTaskDetailPanelOpen: false,
					isThinking: false,
					messages: [],
					messagesError: null,
					pendingAnswers: [],
					pendingQuestionIndex: 0,
					projects: [],
					selectedSession: null,
					sidebarControlId: "chat-sidebar-toggle-test",
					sidebarToggleRef: createRef<HTMLInputElement>(),
					sessions: [session],
					streamLines: [],
					onAnswerChange: () => undefined,
					onArchiveSession: () => undefined,
					onCloseSidebar: () => undefined,
					onCloseTaskDetails: () => undefined,
					onDraftChange: () => undefined,
					onNewSession: () => undefined,
					onToggleTaskDetails: () => undefined,
					onSearch: () => undefined,
					onSelectCommand: () => undefined,
					onSelectOption: () => undefined,
					onSelectSession: () => undefined,
					onSubmit: () => undefined,
					onSubmitAnswers: () => undefined,
				}),
			),
		);

		expect(html).toContain("Back at it, roy");
		expect(html).toContain("Tell devos.ing what you are working on");
		expect(html).not.toContain("Welcome, roy. I am devos.ing.");
	});

	it("renders the selected empty-session welcome state", () => {
		const session = chatSession();
		const queryClient = new QueryClient();
		const html = renderToStaticMarkup(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(ChatRoomPanelView, {
					activeSessionId: session.id,
					activeTaskId: null,
					draft: "",
					isBusy: false,
					isCreatingSession: false,
					isMessagesLoading: false,
					isSending: false,
					isTaskDetailPanelOpen: false,
					isThinking: false,
					messages: [],
					messagesError: null,
					pendingAnswers: [],
					pendingQuestionIndex: 0,
					projects: [],
					selectedSession: session,
					sidebarControlId: "chat-sidebar-toggle-test",
					sidebarToggleRef: createRef<HTMLInputElement>(),
					sessions: [session],
					streamLines: [],
					onAnswerChange: () => undefined,
					onArchiveSession: () => undefined,
					onCloseSidebar: () => undefined,
					onCloseTaskDetails: () => undefined,
					onDraftChange: () => undefined,
					onNewSession: () => undefined,
					onToggleTaskDetails: () => undefined,
					onSearch: () => undefined,
					onSelectCommand: () => undefined,
					onSelectOption: () => undefined,
					onSelectSession: () => undefined,
					onSubmit: () => undefined,
					onSubmitAnswers: () => undefined,
				}),
			),
		);

		expect(html).toContain("Welcome, roy. I am devos.ing.");
		expect(html).toContain("Where do you want to start?");
		expect(html).not.toContain("DEVOS.ING");
	});

	it("renders task details in the main chat layout when the panel is open", () => {
		const session = chatSession();
		const queryClient = new QueryClient();
		const html = renderToStaticMarkup(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(ChatRoomPanelView, {
					activeSessionId: session.id,
					activeTaskId: "task-1",
					draft: "",
					isBusy: false,
					isCreatingSession: false,
					isMessagesLoading: false,
					isSending: false,
					isTaskDetailPanelOpen: true,
					isThinking: false,
					messages: [],
					messagesError: null,
					pendingAnswers: [],
					pendingQuestionIndex: 0,
					projects: [],
					selectedSession: session,
					sidebarControlId: "chat-sidebar-toggle-test",
					sidebarToggleRef: createRef<HTMLInputElement>(),
					sessions: [session],
					streamLines: [],
					onAnswerChange: () => undefined,
					onArchiveSession: () => undefined,
					onCloseSidebar: () => undefined,
					onCloseTaskDetails: () => undefined,
					onDraftChange: () => undefined,
					onNewSession: () => undefined,
					onSearch: () => undefined,
					onSelectCommand: () => undefined,
					onSelectOption: () => undefined,
					onSelectSession: () => undefined,
					onSubmit: () => undefined,
					onSubmitAnswers: () => undefined,
					onToggleTaskDetails: () => undefined,
				}),
			),
		);

		expect(html).toContain("Close task details");
		expect(html).toContain("Loading task");
		expect(html).toContain('aria-pressed="true"');
	});

	it("renders chat task details as read-only session content", () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(
			serverStateQueryKeys.boardTask("task-1"),
			boardTask(),
		);
		const html = renderToStaticMarkup(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(ChatTaskDetailPanel, {
					isOpen: true,
					taskId: "task-1",
					onClose: () => undefined,
				}),
			),
		);

		expect(html).toContain("Read-only task title");
		expect(html).toContain("Read-only task description");
		expect(html).not.toContain('aria-label="Title"');
		expect(html).not.toContain('aria-label="Description"');
		expect(html).not.toContain('aria-label="Status"');
		expect(html).not.toContain("Autosave ready");
	});
});

function chatSession(
	overrides: Partial<ChatSessionRecord> = {},
): ChatSessionRecord {
	return {
		id: "session-1",
		workspaceId: "owner-1",
		projectId: "default",
		taskId: "task-1",
		title: "Untitled",
		pendingRequest: null,
		pendingQuestions: [],
		archived: false,
		createdAt: "2026-05-20T00:00:00.000Z",
		updatedAt: "2026-05-20T00:00:00.000Z",
		...overrides,
	};
}

function boardTask(): ProjectBoardTaskRecord {
	return {
		id: "task-1",
		taskKey: "TASK(owner-1)-1",
		projectId: "default",
		title: "Read-only task title",
		content: "Read-only task description",
		priority: 2,
		status: "in_progress",
		dueDate: null,
		creatorId: "owner-1",
		assigneeId: null,
		linkedPr: null,
		linearIssueId: null,
		linearIdentifier: null,
		linearUrl: null,
		createdAt: "2026-05-20T00:00:00.000Z",
		updatedAt: "2026-05-20T00:00:00.000Z",
	};
}

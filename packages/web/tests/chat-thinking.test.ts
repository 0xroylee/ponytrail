import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { shouldShowChatThinkingIndicator } from "../src/components/chat-room/chat-thinking-state";
import { ChatTranscript } from "../src/components/chat-room/chat-transcript";
import { TextShimmer } from "../src/components/loading/text-shimmer";
import type { ChatMessageRecord, ChatSessionRecord } from "../src/lib/api";

describe("chat thinking indicator", () => {
	it("shows only for a pending send on the active session without output", () => {
		expect(
			shouldShowChatThinkingIndicator({
				hasPendingQuestions: false,
				isSending: true,
				selectedSessionId: "session-1",
				sendingSessionId: "session-1",
				streamLineCount: 0,
			}),
		).toBe(true);
		expect(
			shouldShowChatThinkingIndicator({
				hasPendingQuestions: false,
				isSending: true,
				selectedSessionId: "session-1",
				sendingSessionId: "session-2",
				streamLineCount: 0,
			}),
		).toBe(false);
		expect(
			shouldShowChatThinkingIndicator({
				hasPendingQuestions: false,
				isSending: true,
				selectedSessionId: "session-1",
				sendingSessionId: "session-1",
				streamLineCount: 1,
			}),
		).toBe(false);
		expect(
			shouldShowChatThinkingIndicator({
				hasPendingQuestions: true,
				isSending: true,
				selectedSessionId: "session-1",
				sendingSessionId: "session-1",
				streamLineCount: 0,
			}),
		).toBe(false);
	});

	it("renders shimmer text for thinking and suppresses it when streams exist", () => {
		const html = renderTranscript({ isThinking: true, streamLines: [] });
		expect(html).toContain("Thinking...");
		expect(html).toContain("text-shimmer");
		expect(html).toContain("<output");

		const idleHtml = renderTranscript({ isThinking: false, streamLines: [] });
		expect(idleHtml).not.toContain("Thinking...");

		const streamingHtml = renderTranscript({
			isThinking: true,
			streamLines: [{ id: "run-1", stream: "system", text: "Working" }],
		});
		expect(streamingHtml).not.toContain("Thinking...");
		expect(streamingHtml).toContain("Working");
	});

	it("renders reusable shimmer content", () => {
		const html = renderToStaticMarkup(
			createElement(TextShimmer, null, "Loading"),
		);
		expect(html).toContain("Loading");
		expect(html).toContain("text-shimmer");
	});

	it("renders one pending clarification question at a time", () => {
		const html = renderToStaticMarkup(
			createElement(ChatTranscript, {
				error: null,
				isLoading: false,
				isThinking: false,
				messages: [],
				pendingAnswers: ["codex"],
				pendingQuestionIndex: 1,
				session: chatSession({
					pendingQuestions: [
						{
							question: "Which agent?",
							options: [
								{ label: "Codex", value: "codex" },
								{ label: "Claude", value: "claude" },
							],
						},
						{ question: "What scope?" },
					],
				}),
				streamLines: [],
				onAnswerChange: () => undefined,
				onSubmitAnswers: () => undefined,
			}),
		);

		expect(html).toContain("What scope?");
		expect(html).not.toContain("Which agent?");
		expect(html).toContain("Type a custom answer");
	});

	it("renders assistant notes plainly and plan-shaped content in a box", () => {
		const noteHtml = renderTranscript({
			isThinking: false,
			messages: [
				chatMessage({
					content: "I need a bit more detail before planning.",
					role: "assistant",
				}),
			],
			streamLines: [],
		});
		expect(noteHtml).toContain('data-chat-message-display="assistant-note"');
		expect(noteHtml).not.toContain("border-zinc-800 bg-[#17181c]");

		const planHtml = renderTranscript({
			isThinking: false,
			messages: [
				chatMessage({
					content: [
						"Title",
						"Ship the workflow",
						"Summary",
						"Make the behavior clear.",
						"Test plan",
						"Run the focused tests.",
					].join("\n"),
					role: "assistant",
				}),
			],
			streamLines: [],
		});
		expect(planHtml).toContain('data-chat-message-display="plan"');
		expect(planHtml).toContain("Plan");
		expect(planHtml).toContain("border-blue-900");
	});

	it("keeps user and error messages boxed", () => {
		const html = renderTranscript({
			isThinking: false,
			messages: [
				chatMessage({ content: "Please do the thing", role: "user" }),
				chatMessage({
					content: "Something failed",
					kind: "error",
					role: "system",
				}),
			],
			streamLines: [],
		});

		expect(html).toContain('data-chat-message-display="standard"');
		expect(html).toContain('data-chat-message-display="error"');
		expect(html).toContain("justify-self-end border-zinc-700 bg-zinc-800");
		expect(html).toContain("border-red-900");
	});
});

function renderTranscript({
	isThinking,
	messages = [],
	streamLines,
}: {
	isThinking: boolean;
	messages?: ChatMessageRecord[];
	streamLines: Array<{
		id: string;
		stream: "stdout" | "stderr" | "system";
		text: string;
	}>;
}): string {
	return renderToStaticMarkup(
		createElement(ChatTranscript, {
			error: null,
			isLoading: false,
			isThinking,
			messages,
			pendingAnswers: [],
			pendingQuestionIndex: 0,
			session: chatSession(),
			streamLines,
			onAnswerChange: () => undefined,
			onSubmitAnswers: () => undefined,
		}),
	);
}

function chatMessage(
	overrides: Partial<ChatMessageRecord> = {},
): ChatMessageRecord {
	return {
		id: "message-1",
		sessionId: "session-1",
		role: "assistant",
		kind: "message",
		content: "Message",
		taskId: null,
		commandAction: null,
		metadata: null,
		createdAt: "2026-05-20T00:00:00.000Z",
		...overrides,
	};
}

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
		createdAt: "2026-05-20T00:00:00.000Z",
		updatedAt: "2026-05-20T00:00:00.000Z",
		...overrides,
	};
}

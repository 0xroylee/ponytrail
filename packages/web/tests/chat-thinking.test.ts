import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { shouldShowChatThinkingIndicator } from "../src/components/chat-room/chat-thinking-state";
import { ChatTranscript } from "../src/components/chat-room/chat-transcript";
import { TextShimmer } from "../src/components/loading/text-shimmer";
import type { ChatSessionRecord } from "../src/lib/api";

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
});

function renderTranscript({
	isThinking,
	streamLines,
}: {
	isThinking: boolean;
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
			messages: [],
			pendingAnswers: [],
			pendingQuestionIndex: 0,
			session: chatSession(),
			streamLines,
			onAnswerChange: () => undefined,
			onSubmitAnswers: () => undefined,
		}),
	);
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

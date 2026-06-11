import { describe, expect, it } from "bun:test";
import { shouldScrollChatTranscriptToBottom } from "../src/components/chat-room/chat-transcript-scroll-state";

describe("chat transcript scroll state", () => {
	it("scrolls the selected session when new messages arrive", () => {
		expect(
			shouldScrollChatTranscriptToBottom({
				currentMessageKey: "message-1:2026-06-11T00:00:01.000Z",
				currentSessionId: "session-1",
				isLoading: false,
				previousMessageKey: "message-0:2026-06-11T00:00:00.000Z",
				previousSessionId: "session-1",
			}),
		).toBe(true);
	});

	it("does not scroll for session-only updates", () => {
		expect(
			shouldScrollChatTranscriptToBottom({
				currentMessageKey: "message-1:2026-06-11T00:00:01.000Z",
				currentSessionId: "session-1",
				isLoading: false,
				previousMessageKey: "message-1:2026-06-11T00:00:01.000Z",
				previousSessionId: "session-1",
			}),
		).toBe(false);
	});
});

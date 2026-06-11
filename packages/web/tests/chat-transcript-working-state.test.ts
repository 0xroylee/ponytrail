import { describe, expect, it } from "bun:test";
import { shouldShowChatTranscriptWorkingHeader } from "../src/components/chat-room/chat-transcript-working-state";

describe("chat transcript working state", () => {
	it("shows the working header while chat work is active", () => {
		expect(
			shouldShowChatTranscriptWorkingHeader({
				hasWorkingStart: true,
				isPlanning: false,
				isThinking: true,
				streamLineCount: 0,
			}),
		).toBe(true);
		expect(
			shouldShowChatTranscriptWorkingHeader({
				hasWorkingStart: true,
				isPlanning: false,
				isThinking: false,
				streamLineCount: 1,
			}),
		).toBe(true);
	});

	it("hides the working header for idle transcript updates", () => {
		expect(
			shouldShowChatTranscriptWorkingHeader({
				hasWorkingStart: false,
				isPlanning: true,
				isThinking: false,
				streamLineCount: 0,
			}),
		).toBe(false);
		expect(
			shouldShowChatTranscriptWorkingHeader({
				hasWorkingStart: true,
				isPlanning: false,
				isThinking: false,
				streamLineCount: 0,
			}),
		).toBe(false);
	});
});

import { describe, expect, it } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isActiveMissionStatus } from "../src/components/chat-room/chat-mission-progress-state";
import { ChatTranscript } from "../src/components/chat-room/chat-transcript";
import type { ChatMissionProgressViewModel } from "../src/components/chat-room/types/chat-mission-progress.types";
import type { ChatStreamLine } from "../src/components/chat-room/types/chat-room.types";
import type { ChatMessageRecord } from "../src/lib/api";
import {
	chatMessage,
	chatSession,
	missionModel,
	textContent,
} from "./chat-mission-progress-fixtures";

describe("chat mission progress", () => {
	it("renders sticky mission progress before chat history", () => {
		const mission = missionModel();
		const html = renderTranscript({
			messages: [chatMessage({ content: "Chat before mission" })],
			missionProgress: mission,
		});

		expect(html).toContain('data-chat-mission-progress="true"');
		expect(html).toContain('data-chat-mission-progress-sticky="true"');
		expect(textContent(html)).toContain("Mission");
		expect(textContent(html)).toContain("TASK-42");
		expect(html.indexOf('data-chat-mission-progress="true"')).toBeLessThan(
			html.indexOf("Chat before mission"),
		);

		const emptyHtml = renderTranscript({ missionProgress: null });
		expect(emptyHtml).not.toContain('data-chat-mission-progress="true"');
	});

	it("shows the selected-session welcome instead of an empty task prompt", () => {
		const html = renderTranscript({ missionProgress: null });
		const text = textContent(html);

		expect(text).toContain("Welcome, roy. I am devos.ing.");
		expect(text).not.toContain("Untitled");
		expect(text).not.toContain("Ready for a task.");
	});

	it("treats only active workflow statuses as mission-visible", () => {
		expect(isActiveMissionStatus("backlog")).toBe(false);
		expect(isActiveMissionStatus("plan")).toBe(false);
		expect(isActiveMissionStatus("done")).toBe(false);
		expect(isActiveMissionStatus("blocked")).toBe(false);
		expect(isActiveMissionStatus("in_progress")).toBe(true);
		expect(isActiveMissionStatus("in_review")).toBe(true);
	});

	it("maps task activity into status, notes, logs, steps, and result", () => {
		const mission = missionModel();

		expect(mission.statusLabel).toBe("In Progress");
		expect(mission.notes[0]?.body).toContain("changed status");
		expect(mission.latestLogLines.at(-1)).toEqual(
			expect.objectContaining({ stream: "stderr", text: "Needs retry" }),
		);
		expect(mission.latestResult).toEqual({
			label: "succeeded",
			tone: "success",
		});
		expect(mission.phases.map((phase) => phase.id)).toEqual([
			"plan",
			"implement",
			"testing",
			"qa",
		]);
		expect(mission.phases.map((phase) => phase.status)).toEqual([
			"success",
			"success",
			"success",
			"success",
		]);

		const html = renderTranscript({ missionProgress: mission });
		const text = textContent(html);
		expect(text).toContain("In Progress");
		expect(html).toContain('data-mission-log-panel="true"');
		expect(html).toContain('data-mission-workflow="true"');
		expect(html.indexOf('data-mission-log-panel="true"')).toBeLessThan(
			html.indexOf('data-mission-workflow="true"'),
		);
		expect(html).toContain('data-mission-phase="plan"');
		expect(html).toContain('data-mission-phase="implement"');
		expect(html).toContain('data-mission-phase="testing"');
		expect(html).toContain('data-mission-phase="qa"');
		expect(text).toContain("Planning complete");
		expect(text).toContain("Needs retry");
		expect(text).not.toContain("Progress steps");
	});

	it("uses live stream lines above the workflow when present", () => {
		const html = renderTranscript({
			missionProgress: missionModel(),
			streamLines: [
				{ id: "live-1", stream: "stdout", text: "Live output" },
				{ id: "live-2", stream: "stderr", text: "Live failure" },
			],
		});
		const text = textContent(html);

		expect(text).toContain("Live output");
		expect(text).toContain("Live failure");
		expect(text).not.toContain("Planning complete");
	});

	it("derives QA status from the latest result without QA events", () => {
		const mission = missionModel("failed");

		expect(mission.latestResult).toEqual({
			label: "failed",
			tone: "error",
		});
		expect(mission.phases.find((phase) => phase.id === "qa")?.status).toBe(
			"failed",
		);

		const html = renderTranscript({ missionProgress: mission });
		expect(html).toContain('data-mission-phase="qa"');
		expect(html).toContain('data-mission-phase-status="failed"');
		expect(html).toContain("text-red-300");
	});
});

function renderTranscript({
	messages = [],
	missionProgress,
	streamLines = [],
}: {
	messages?: ChatMessageRecord[];
	missionProgress: ChatMissionProgressViewModel | null;
	streamLines?: ChatStreamLine[];
}): string {
	const queryClient = new QueryClient();
	return renderToStaticMarkup(
		createElement(
			QueryClientProvider,
			{ client: queryClient },
			createElement(ChatTranscript, {
				error: null,
				isLoading: false,
				isThinking: false,
				missionProgress,
				messages,
				session: chatSession(),
				streamLines,
				workingStartedAt: null,
				onDraftCommand: () => undefined,
			}),
		),
	);
}

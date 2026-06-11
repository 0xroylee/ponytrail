import { describe, expect, it } from "bun:test";
import { isPlanContent } from "../src/components/chat-room/chat-message-display";
import { createChatTranscriptRows } from "../src/components/chat-room/chat-transcript-message-state";
import type { ChatMessageRecord, ChatSessionRecord } from "../src/lib/api";
import {
	missionModelWithSteps,
	progressStep,
} from "./chat-mission-progress-fixtures";

const ALLOWED_MESSAGE_TITLES = [
	"Summary",
	"Instructions",
	"Plan",
	"Checkpoints",
	"Running",
	"Thinking",
	"Action",
	"Files changed",
	"Guideline",
];

describe("chat message taxonomy", () => {
	it("uses only approved summary categories in Messages", () => {
		const rows = createChatTranscriptRows({
			messages: [
				message("message-1", "user", "Build it"),
				message("message-2", "assistant", "Task is ready.", "task"),
			],
			missionProgress: missionModelWithSteps({
				steps: [
					progressStep(1, "checkpoint", "succeeded", {
						stage: "plan",
						summary: "Plan completed",
					}),
					progressStep(2, "implementation", "started", {
						stage: "in_progress",
						summary: "Implementing issue",
					}),
					progressStep(3, "review-testing", "succeeded", {
						stage: "in_review",
						summary: "Testing completed",
					}),
					progressStep(4, "file-changes", "succeeded", {
						detail: "Changed two files.",
						stage: "in_progress",
					}),
				],
			}),
			session: chatSession({ workflowState: "testing" }),
		});

		const titles = summaryTitles(rows);
		expect(titles).toEqual([
			"Summary",
			"Running",
			"Plan",
			"Action",
			"Running",
			"Files changed",
		]);
		expect(
			titles.every((title) => ALLOWED_MESSAGE_TITLES.includes(title)),
		).toBe(true);
	});

	it("maps workflow states to approved message categories", () => {
		expect(workflowStateTitle("brainstorm")).toBe("Thinking");
		expect(workflowStateTitle("plan")).toBe("Plan");
		expect(workflowStateTitle("implement")).toBe("Running");
		expect(workflowStateTitle("testing")).toBe("Running");
	});

	it("recognizes the current approved headings as plan content", () => {
		expect(
			isPlanContent(
				[
					"Summary",
					"Ship the message taxonomy.",
					"Instructions",
					"Keep output scoped.",
					"Plan",
					"Update the parser.",
					"Checkpoints",
					"Add focused tests.",
					"Running",
					"Run web checks.",
					"Thinking",
					"Reason through edge cases.",
					"Action",
					"Patch the helpers.",
					"Files changed",
					"List touched files.",
					"Guideline",
					"Keep the vocabulary tight.",
				].join("\n"),
			),
		).toBe(true);
	});

	it("does not classify old heading-only content as plan content", () => {
		expect(
			isPlanContent(
				[
					"Title",
					"Old planner heading",
					"Key Changes",
					"Older section name",
					"Test plan",
					"Legacy verification wording",
				].join("\n"),
			),
		).toBe(false);
	});
});

function workflowStateTitle(
	workflowState: ChatSessionRecord["workflowState"],
): string | null {
	return (
		summaryTitles(
			createChatTranscriptRows({
				messages: [],
				missionProgress: null,
				session: chatSession({ workflowState }),
			}),
		)[0] ?? null
	);
}

function message(
	id: string,
	role: ChatMessageRecord["role"],
	content: string,
	kind: ChatMessageRecord["kind"] = "message",
): ChatMessageRecord {
	return {
		id,
		commandAction: null,
		content,
		createdAt: "2026-06-10T00:00:00.000Z",
		kind,
		metadata: null,
		role,
		sessionId: "session-1",
		taskId: null,
	};
}

function chatSession(
	overrides: Partial<ChatSessionRecord> = {},
): ChatSessionRecord {
	return {
		archived: false,
		createdAt: "2026-06-10T00:00:00.000Z",
		id: "session-1",
		lastSeenAt: null,
		pendingQuestions: [],
		pendingRequest: null,
		projectId: "project-1",
		taskId: "task-42",
		title: "Show mission progress",
		updatedAt: "2026-06-10T00:00:00.000Z",
		workflowState: null,
		workspaceId: "workspace-1",
		...overrides,
	};
}

function summaryTitles(
	rows: ReturnType<typeof createChatTranscriptRows>,
): string[] {
	return rows.flatMap((row) => (row.kind === "summary" ? [row.title] : []));
}

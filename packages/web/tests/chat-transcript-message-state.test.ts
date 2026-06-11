import { describe, expect, it } from "bun:test";
import { createChatTranscriptRows } from "../src/components/chat-room/chat-transcript-message-state";
import type { ChatMessageRecord, ChatSessionRecord } from "../src/lib/api";
import {
	missionModel,
	missionModelWithSteps,
	progressStep,
} from "./chat-mission-progress-fixtures";

describe("chat transcript message state", () => {
	it("builds transcript rows only from API chat messages", () => {
		const messages = [
			message("message-1", "user", "API user message"),
			message("message-2", "assistant", "API assistant message"),
		];

		expect(createChatTranscriptRows({ messages })).toEqual([
			{ kind: "message", message: messages[0] },
			{ kind: "message", message: messages[1] },
		]);
	});

	it("adds compact API-backed summary rows for task progress", () => {
		const messages = [
			message("message-1", "user", "Build it"),
			message(
				"message-2",
				"assistant",
				"Task TASK-42: Show mission progress is ready for planning.",
				"task",
			),
		];
		const rows = createChatTranscriptRows({
			messages,
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
					progressStep(4, "review-testing", "succeeded", {
						stage: "in_review",
						summary: "Testing completed",
					}),
					progressStep(5, "file-changes", "succeeded", {
						stage: "in_progress",
						detail:
							"Implement file changes: +12/-3 lines in 2 files: one.ts, two.ts.",
					}),
				],
			}),
			session: chatSession({ workflowState: "testing" }),
		});

		expect(rows.map((row) => row.kind)).toEqual([
			"message",
			"message",
			"summary",
			"summary",
			"summary",
			"summary",
			"summary",
			"summary",
		]);
		expect(summaryBodies(rows)).toContain(
			"Ready: Task TASK-42: Show mission progress is ready for planning.",
		);
		expect(summaryTitles(rows)).toEqual([
			"Brainstorm result",
			"Processing",
			"Planned result",
			"Implement result",
			"Testing result",
			"File changes",
		]);
		expect(summaryBodies(rows)).toContain("Implementing: Testing completed");
		expect(summaryBodies(rows)).toContain("Plan output");
		expect(summaryBodies(rows)).toContain("Implement output");
		expect(summaryBodies(rows)).toContain("Testing output");
		expect(summaryBodies(rows)).toContain(
			"Implement file changes: +12/-3 lines in 2 files: one.ts, two.ts.",
		);
	});

	it("falls back to session workflow state before mission activity is available", () => {
		const rows = createChatTranscriptRows({
			messages: [],
			missionProgress: null,
			session: chatSession({ workflowState: "brainstorm" }),
		});

		expect(rows).toEqual([
			{
				body: "Thinking through the request.",
				id: "summary:workflow:brainstorm",
				kind: "summary",
				title: "Thinking",
			},
		]);
	});

	it("renders stored file-change snapshots from task activity", () => {
		const rows = createChatTranscriptRows({
			messages: [],
			missionProgress: missionModelWithSteps({
				steps: [
					progressStep(1, "file-changes", "succeeded", {
						stage: "plan",
						detail: "Plan file changes: No file changes detected.",
					}),
					progressStep(2, "file-changes", "succeeded", {
						stage: "in_review",
						detail: "Testing file changes: +4/-1 lines in one file: test.ts.",
					}),
				],
			}),
		});

		expect(summaryBodies(rows)).toContain(
			"Plan file changes: No file changes detected.",
		);
		expect(summaryBodies(rows)).toContain(
			"Testing file changes: +4/-1 lines in one file: test.ts.",
		);
	});

	it("does not show live file changes without a stored snapshot", () => {
		const rows = createChatTranscriptRows({
			messages: [],
			missionProgress: missionModel(),
		});

		expect(summaryTitles(rows)).not.toContain("File changes");
	});

	it("outputs text only from structured testing result events", () => {
		const mission = missionModelWithSteps({
			steps: [
				progressStep(1, "review-testing", "succeeded", {
					stage: "in_review",
					summary: "workflow succeeded",
				}),
			],
		});
		const rows = createChatTranscriptRows({
			messages: [],
			missionProgress: {
				...mission,
				phaseLogLines: {
					...mission.phaseLogLines,
					testing: [
						{
							id: "json-log",
							stream: "stdout",
							text: '{"type":"turn.completed","usage":{"input_tokens":1}}',
						},
						{
							id: "truncated-json-log",
							stream: "stdout",
							text: '{"type":"item.completed","item":{"type":"agent_message","text":"done"',
						},
						{
							id: "text-json-log",
							stream: "stdout",
							text: JSON.stringify({
								type: "item.completed",
								item: {
									type: "agent_message",
									text: "- `bun test` passed: 1103 tests, 0 failures",
								},
							}),
						},
					],
				},
			},
		});

		expect(summaryBodies(rows)).not.toContain(
			'{"type":"turn.completed","usage":{"input_tokens":1}}',
		);
		expect(summaryBodies(rows)).not.toContain(
			'{"type":"item.completed","item":{"type":"agent_message","text":"done"',
		);
		expect(summaryBodies(rows)).toContain(
			"bun test passed: 1103 tests, 0 failures",
		);
	});
});

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
		createdAt: `2026-06-10T00:00:0${id.endsWith("1") ? "1" : "2"}.000Z`,
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

function summaryBodies(
	rows: ReturnType<typeof createChatTranscriptRows>,
): string[] {
	return rows.flatMap((row) => (row.kind === "summary" ? [row.body] : []));
}

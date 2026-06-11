import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCommand } from "adapters";
import {
	addWorkflowProgressListener,
	emitWorkflowProgress,
} from "../src/features/server";
import type { WorkflowProgressEvent } from "../src/features/server";
import { emitPhaseFileChangesSnapshot } from "../src/features/workflow/file-change-snapshot";
import { createWorkflowExecutionRecorder } from "../src/features/workflow/workflow-execution-recorder";
import { project, state } from "./smoke-fixtures";

interface WorkflowCall {
	url: string;
	body: {
		requestId: string;
		action: string;
		payload?: unknown;
	};
}

const previousWebSocket = globalThis.WebSocket;

afterEach(() => {
	globalThis.WebSocket = previousWebSocket;
});

describe("WorkflowExecutionRecorder", () => {
	it("emits text-only file-change snapshots for the execution workspace", async () => {
		const workspace = await mkdtemp(
			path.join(os.tmpdir(), "devos-file-snapshot-"),
		);
		await runCommand("git", ["init"], { cwd: workspace });
		await writeFile(
			path.join(workspace, "changed.ts"),
			"export const x = 1;\n",
		);
		await runCommand("git", ["add", "changed.ts"], { cwd: workspace });
		const config = project("project-1");
		config.executionPath = "/not-the-run-workspace";
		const runState = state(config, "TASK-1", "in_progress");
		runState.executionWorkspace = {
			branch: "codex/task-1",
			createdAt: "2026-06-10T00:00:00.000Z",
			mode: "git-worktree",
			path: workspace,
		};
		const events: WorkflowProgressEvent[] = [];
		const unsubscribe = addWorkflowProgressListener((event) => {
			events.push(event);
		});

		await emitPhaseFileChangesSnapshot({
			config,
			phaseId: "implement",
			stage: "in_progress",
			state: runState,
		});
		unsubscribe();

		expect(events).toEqual([
			expect.objectContaining({
				action: "file-changes",
				kind: "action",
				stage: "in_progress",
				status: "succeeded",
				detail: expect.stringContaining("Implement file changes: +1/-0"),
			}),
		]);
		const snapshot = events[0];
		expect(snapshot?.kind).toBe("action");
		if (snapshot?.kind !== "action") {
			throw new Error("Expected file-change snapshot action event");
		}
		expect(snapshot.detail).toContain("changed.ts");
		expect(snapshot.detail).not.toContain("{");
	});

	it("forwards agent log identity metadata to append stream payloads", async () => {
		const calls = installWorkflowSocket();
		const config = project("project-1");
		const runState = state(config, "TASK-1", "in_progress");
		runState.issue.id = "task-1";

		const recorder = createWorkflowExecutionRecorder(config, runState);
		await recorder.start();
		emitWorkflowProgress({
			kind: "log",
			projectId: "project-1",
			taskId: "task-1",
			issueKey: "TASK-1",
			stage: "implementing",
			stream: "stdout",
			level: "info",
			message: "agent stream line\n",
			agentRole: "implementing",
			agentBackend: "codex",
			agentModel: "gpt-5.4",
			phrase: "implementing",
		} as Parameters<typeof emitWorkflowProgress>[0]);
		await recorder.finish("succeeded");

		const append = calls.find(
			(call) => call.body.action === "taskExecutions.appendStream",
		);
		expect(append?.body.payload).toMatchObject({
			projectId: "project-1",
			taskId: "task-1",
			issueKey: "TASK-1",
			stage: "implementing",
			stream: "stdout",
			text: "agent stream line\n",
			agentRole: "implementing",
			agentBackend: "codex",
			agentModel: "gpt-5.4",
			phrase: "implementing",
		});
	});
});

function installWorkflowSocket(): WorkflowCall[] {
	const calls: WorkflowCall[] = [];
	globalThis.WebSocket = class FakeWorkflowSocket extends EventTarget {
		constructor(readonly url: string) {
			super();
			queueMicrotask(() => this.dispatchEvent(new Event("open")));
		}

		send(message: string): void {
			const body = JSON.parse(message) as WorkflowCall["body"];
			calls.push({ url: this.url, body });
			queueMicrotask(() => {
				this.dispatchEvent(
					new MessageEvent("message", {
						data: JSON.stringify({
							type: "workflow.response",
							requestId: body.requestId,
							action: body.action,
							status: "ok",
						}),
					}),
				);
			});
		}

		close(): void {}
	} as unknown as typeof WebSocket;
	return calls;
}

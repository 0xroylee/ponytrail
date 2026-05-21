import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	createReliableWorkflowDataClient,
	drainProjectWorkflowDataOutbox,
} from "../src/features/workflow/reliable-workflow-data-client";
import type { WorkflowDataWebSocket } from "../src/features/workflow/workflow-data-client";
import { workflowDataOutboxPath } from "../src/features/workflow/workflow-data-outbox";

describe("workflow data outbox", () => {
	it("buffers retryable workflow mutations and drains them later", async () => {
		const workspacePath = await mkdtemp(
			path.join(os.tmpdir(), "devos-workflow-outbox-"),
		);
		const context = { workspacePath, projectId: "project-1" };
		const sentActions: string[] = [];
		let failNextSocket = true;
		class FakeWorkflowSocket implements WorkflowDataWebSocket {
			private readonly listeners = new Map<
				string,
				Array<(event: { data?: unknown }) => void>
			>();

			constructor(readonly url: string) {
				queueMicrotask(() => {
					if (failNextSocket) {
						failNextSocket = false;
						this.dispatch("error");
						return;
					}
					this.dispatch("open");
				});
			}

			send(message: string): void {
				const request = JSON.parse(message) as {
					requestId: string;
					action: string;
				};
				sentActions.push(request.action);
				queueMicrotask(() => {
					this.dispatch("message", {
						data: JSON.stringify({
							type: "workflow.response",
							requestId: request.requestId,
							action: request.action,
							status: "ok",
						}),
					});
				});
			}

			close(): void {}

			addEventListener(
				event: "open" | "message" | "error" | "close",
				listener: (event: { data?: unknown }) => void,
			): void {
				this.listeners.set(event, [
					...(this.listeners.get(event) ?? []),
					listener,
				]);
			}

			private dispatch(event: string, payload: { data?: unknown } = {}): void {
				for (const listener of this.listeners.get(event) ?? []) {
					listener(payload);
				}
			}
		}

		const client = createReliableWorkflowDataClient({
			context,
			WebSocketImpl: FakeWorkflowSocket,
		});
		await client.request("tasks.update", {
			taskId: "task-1",
			values: { status: "done" },
		});

		expect(await readFile(workflowDataOutboxPath(context), "utf8")).toContain(
			"tasks.update",
		);

		await drainProjectWorkflowDataOutbox(context, {
			WebSocketImpl: FakeWorkflowSocket,
		});

		expect(sentActions).toEqual(["tasks.update"]);
		expect(await readFile(workflowDataOutboxPath(context), "utf8")).toBe("");
	});
});

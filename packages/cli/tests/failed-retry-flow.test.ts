import { describe, expect, it } from "bun:test";
import {
	type WorkflowProgressEvent,
	addWorkflowProgressListener,
} from "../src/features/server";
import { issue, passReview, simplePlan, state } from "./smoke-fixtures";
import { createSmokeHarness } from "./smoke-harness";

const result = (finalMessage: string, sessionId?: string) => ({
	finalMessage,
	stdout: "",
	sessionId,
	usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
});

describe("failed issue retry flow", () => {
	it("retries failed planning run states from planning", async () => {
		const h = await createSmokeHarness();
		h.addIssue("default", issue("ENG-17"));
		const failed = state(h.project("default"), "ENG-17", "failed");
		failed.failedStage = "plan";
		failed.lastError = "codex failed with exit code 1";
		await h.presetState("default", failed);
		const agent = h.agent("default");
		agent.plans.push(result(simplePlan, "retry-failed-session"));
		agent.resumes.push(result("implemented"));
		agent.reviews.push(result(passReview));

		await h.run({ issueArg: "ENG-17" });

		const run = await h.state("default", "ENG-17");
		expect(run?.stage).toBe("done");
		expect(run?.planSummary).toBe(simplePlan);
		expect(run?.lastError).toBeUndefined();
		expect(agent.plans).toHaveLength(0);
	});

	it("records terminal failed run states as failed workflow progress", async () => {
		const h = await createSmokeHarness();
		h.addIssue("default", issue("ENG-18"));
		const blocked = state(h.project("default"), "ENG-18", "blocked");
		blocked.failedStage = "in_progress";
		blocked.lastError = "implementation failed";
		await h.presetState("default", blocked);
		const workflowEvents: WorkflowProgressEvent[] = [];
		const unsubscribe = addWorkflowProgressListener((event) => {
			if (
				event.kind === "action" &&
				event.issueKey === "ENG-18" &&
				event.action === "workflow"
			) {
				workflowEvents.push(event);
			}
		});
		const logs = captureProcessStderr();

		try {
			await h.run({ issueArg: "ENG-18" });
		} finally {
			unsubscribe();
			logs.restore();
		}

		expect((await h.state("default", "ENG-18"))?.stage).toBe("failed");
		expect(workflowEvents).toContainEqual(
			expect.objectContaining({ action: "workflow", status: "failed" }),
		);
		expect(workflowEvents).not.toContainEqual(
			expect.objectContaining({ action: "workflow", status: "succeeded" }),
		);
		expect(logs.output()).toContain(
			'Issue workflow finished projectId=default issueKey=ENG-18 stage=failed failedStage=in_progress error="implementation failed"',
		);
	});
});

function captureProcessStderr() {
	let text = "";
	const originalWrite = process.stderr.write;
	process.stderr.write = ((chunk: string | Uint8Array) => {
		text += chunk.toString();
		return true;
	}) as typeof process.stderr.write;
	return {
		output: () => text,
		restore: () => {
			process.stderr.write = originalWrite;
		},
	};
}

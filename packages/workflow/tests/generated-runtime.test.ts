import { describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createDevosWorkflow } from "../src";
import type {
	CreateDevosWorkflowPromptAdapter,
	GeneratedWorkflowContext,
	GeneratedWorkflowMeta,
	GeneratedWorkflowRunResult,
} from "../src";

interface GeneratedWorkflowModule {
	meta: GeneratedWorkflowMeta;
	run(context: GeneratedWorkflowContext): Promise<GeneratedWorkflowRunResult>;
}

describe("generated workflow runtime contract", () => {
	it("runs precheck, parallel phrase agents, and final check", async () => {
		await withWorkflow(async (workflow) => {
			const fake = fakeContext({ commandCodes: [0, 0] });
			const result = await workflow.run(fake.context);

			expect(result.ok).toBe(true);
			expect(fake.commandCalls).toEqual([
				{ command: "bun", args: ["--version"], stage: "precheck" },
				{ command: "bun", args: ["test"], stage: "check" },
			]);
			expect(fake.agentCalls.map((call) => call.prompt)).toEqual([
				"Inspect the changes",
				"Summarize the result",
			]);
			expect(result.phraseResults.map((entry) => entry.status)).toEqual([
				"fulfilled",
				"fulfilled",
			]);
			expect(fake.logs).toContain("Inspect the changes");
		});
	});

	it("skips phrase agents and check when precheck fails", async () => {
		await withWorkflow(async (workflow) => {
			const fake = fakeContext({ commandCodes: [1] });
			const result = await workflow.run(fake.context);

			expect(result.ok).toBe(false);
			expect(result.check).toBeUndefined();
			expect(result.phraseResults).toEqual([]);
			expect(fake.agentCalls).toEqual([]);
			expect(fake.commandCalls).toHaveLength(1);
		});
	});

	it("captures rejected phrase agents and still runs final check", async () => {
		await withWorkflow(async (workflow) => {
			const fake = fakeContext({
				commandCodes: [0, 0],
				rejectAgent: "reviewer",
			});
			const result = await workflow.run(fake.context);

			expect(result.ok).toBe(false);
			expect(fake.commandCalls.map((call) => call.stage)).toEqual([
				"precheck",
				"check",
			]);
			expect(result.phraseResults[1]).toMatchObject({
				status: "rejected",
				error: "reviewer failed",
			});
		});
	});

	it("returns a failed result when final check fails", async () => {
		await withWorkflow(async (workflow) => {
			const fake = fakeContext({ commandCodes: [0, 2] });
			const result = await workflow.run(fake.context);

			expect(result.ok).toBe(false);
			expect(result.check?.code).toBe(2);
			expect(result.phraseResults).toHaveLength(2);
		});
	});
});

async function withWorkflow(
	action: (workflow: GeneratedWorkflowModule) => Promise<void>,
): Promise<void> {
	const tempDir = await mkdtemp(path.join(process.cwd(), ".tmp-workflow-"));
	try {
		const result = await createDevosWorkflow({
			cwd: tempDir,
			outputPath: "runtime",
			prompts: workflowPrompts(),
		});
		const href = `${pathToFileURL(result.workflowPath).href}?${Date.now()}`;
		await action((await import(href)) as GeneratedWorkflowModule);
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

function fakeContext(options: {
	commandCodes: number[];
	rejectAgent?: string;
}) {
	const commandCodes = [...options.commandCodes];
	const commandCalls: Array<{
		command: string;
		args: string[];
		stage: string | undefined;
	}> = [];
	const agentCalls: Array<{ agent: string; prompt: string }> = [];
	const logs: string[] = [];
	const context: GeneratedWorkflowContext = {
		logger: {
			info: (message) => logs.push(String(message)),
			warn: () => undefined,
			error: () => undefined,
		},
		commands: {
			run: async (command, args, runOptions) => {
				commandCalls.push({ command, args, stage: runOptions?.stage });
				return { code: commandCodes.shift() ?? 0, stdout: "", stderr: "" };
			},
		},
		agents: {
			run: async (input) => {
				agentCalls.push({ agent: input.agent, prompt: input.prompt });
				if (input.agent === options.rejectAgent) {
					throw new Error(`${input.agent} failed`);
				}
				return `${input.agent} ok`;
			},
		},
	};
	return { context, commandCalls, agentCalls, logs };
}

function workflowPrompts(): CreateDevosWorkflowPromptAdapter {
	const textAnswers = [
		"Runtime Flow",
		"Runs generated workflow tests.",
		"bun",
		'["--version"]',
		"bun",
		'["test"]',
		"Inspect the changes",
		"codex",
		"skills/review/SKILL.md",
		"Summarize the result",
		"reviewer",
		"skills/summary/SKILL.md",
	];
	const confirmAnswers = [true, false];
	return {
		text: async ({ defaultValue }) => textAnswers.shift() ?? defaultValue ?? "",
		confirm: async () => confirmAnswers.shift() ?? false,
	};
}

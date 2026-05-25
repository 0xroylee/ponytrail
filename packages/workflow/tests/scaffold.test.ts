import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
	createDevosWorkflow,
	formatCreateWorkflowResult,
	normalizeWorkflowOutputPath,
	parseCreateWorkflowArgs,
	parseJsonStringArray,
} from "../src";
import type { CreateDevosWorkflowPromptAdapter } from "../src";

describe("create-devos-workflow scaffold", () => {
	it("normalizes output paths and parses CLI flags", () => {
		expect(normalizeWorkflowOutputPath("flows/review", "/tmp/work")).toBe(
			"/tmp/work/flows/review.mjs",
		);
		expect(normalizeWorkflowOutputPath("review.mjs", "/tmp/work")).toBe(
			"/tmp/work/review.mjs",
		);
		expect(() => normalizeWorkflowOutputPath("   ", "/tmp/work")).toThrow(
			"Workflow output path is required",
		);
		expect(
			parseCreateWorkflowArgs(["workflow.mjs", "--force", "--json"]),
		).toMatchObject({
			outputPath: "workflow.mjs",
			force: true,
			json: true,
		});
		expect(parseJsonStringArray('["run","check"]', "args")).toEqual([
			"run",
			"check",
		]);
		expect(() => parseJsonStringArray('["run",1]', "args")).toThrow(
			"args[1] must be a string",
		);
	});

	it("renders a prompt-driven workflow script with metadata", async () => {
		const tempDir = await mkdtemp(path.join(process.cwd(), ".tmp-workflow-"));
		try {
			const result = await createDevosWorkflow({
				cwd: tempDir,
				prompts: promptAdapter(
					[
						"flows/review",
						"Review Flow",
						"Runs review phrasing.",
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
					],
					[true, false],
				),
			});

			expect(result.workflowPath).toBe(path.join(tempDir, "flows/review.mjs"));
			expect(result.meta.agents).toEqual(["codex", "reviewer"]);
			expect(result.meta.skills).toEqual([
				"skills/review/SKILL.md",
				"skills/summary/SKILL.md",
			]);
			expect(formatCreateWorkflowResult(result, true)).toContain(
				'"workflowPath"',
			);
			const source = await readFile(result.workflowPath, "utf8");
			expect(source).toContain("export const meta");
			expect(source).toContain("Promise.allSettled");
			const module = await import(pathToFileURL(result.workflowPath).href);
			expect(module.meta.title).toBe("Review Flow");
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it("requires force before overwriting an existing workflow", async () => {
		const tempDir = await mkdtemp(path.join(process.cwd(), ".tmp-workflow-"));
		try {
			await createDevosWorkflow({
				cwd: tempDir,
				outputPath: "review",
				prompts: workflowPrompts("Review Flow"),
			});
			await expect(
				createDevosWorkflow({
					cwd: tempDir,
					outputPath: "review",
					prompts: workflowPrompts("Review Again"),
				}),
			).rejects.toThrow("Workflow file already exists");
			await expect(
				createDevosWorkflow({
					cwd: tempDir,
					outputPath: "review",
					force: true,
					prompts: workflowPrompts("Review Again"),
				}),
			).resolves.toMatchObject({
				workflowPath: path.join(tempDir, "review.mjs"),
			});
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});
});

function workflowPrompts(title: string): CreateDevosWorkflowPromptAdapter {
	return promptAdapter([
		title,
		"Runs review phrasing.",
		"bun",
		'["--version"]',
		"bun",
		'["test"]',
		"Inspect the changes",
		"codex",
		"skills/review/SKILL.md",
	]);
}

function promptAdapter(
	textAnswers: string[],
	confirmAnswers: boolean[] = [false],
): CreateDevosWorkflowPromptAdapter {
	return {
		text: async ({ defaultValue }) => textAnswers.shift() ?? defaultValue ?? "",
		confirm: async () => confirmAnswers.shift() ?? false,
	};
}

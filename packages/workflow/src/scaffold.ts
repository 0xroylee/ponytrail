import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	createNodePromptAdapter,
	promptRequired,
	promptWorkflowMeta,
} from "./prompts";
import { renderWorkflowScript } from "./templates";
import type {
	CreateDevosWorkflowOptions,
	CreateDevosWorkflowResult,
} from "./types/workflow.types";

export async function createDevosWorkflow(
	options: CreateDevosWorkflowOptions = {},
): Promise<CreateDevosWorkflowResult> {
	const cwd = path.resolve(options.cwd ?? process.cwd());
	const ownsPromptAdapter = !options.prompts;
	const prompts = options.prompts ?? createNodePromptAdapter();
	try {
		const outputInput =
			options.outputPath ??
			(await promptRequired(prompts, "Workflow output path", "workflow.mjs"));
		const workflowPath = normalizeWorkflowOutputPath(outputInput, cwd);
		await assertCanWriteWorkflow(workflowPath, options.force === true);
		const meta = await promptWorkflowMeta(prompts);
		await mkdir(path.dirname(workflowPath), { recursive: true });
		await writeFile(workflowPath, renderWorkflowScript(meta), "utf8");
		return { workflowPath, meta, files: [workflowPath] };
	} finally {
		if (ownsPromptAdapter) prompts.close?.();
	}
}

export function normalizeWorkflowOutputPath(
	input: string,
	cwd: string,
): string {
	const trimmed = input.trim();
	if (!trimmed) throw new Error("Workflow output path is required");
	const resolved = path.resolve(cwd, trimmed);
	return resolved.endsWith(".mjs") ? resolved : `${resolved}.mjs`;
}

async function assertCanWriteWorkflow(
	workflowPath: string,
	force: boolean,
): Promise<void> {
	try {
		await access(workflowPath);
		if (!force) {
			throw new Error(`Workflow file already exists: ${workflowPath}`);
		}
	} catch (error) {
		if (!isNotFoundError(error)) throw error;
	}
}

function isNotFoundError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: string }).code === "ENOENT"
	);
}

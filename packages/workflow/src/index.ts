#!/usr/bin/env bun
export { parseCreateWorkflowArgs } from "./args";
export { formatCreateWorkflowResult } from "./format";
export { createNodePromptAdapter, parseJsonStringArray } from "./prompts";
export { createDevosWorkflow, normalizeWorkflowOutputPath } from "./scaffold";
export { renderWorkflowScript } from "./templates";
export type {
	CreateDevosWorkflowOptions,
	CreateDevosWorkflowPromptAdapter,
	CreateDevosWorkflowResult,
	GeneratedWorkflowContext,
	GeneratedWorkflowMeta,
	GeneratedWorkflowRunResult,
} from "./types/workflow.types";

import { parseCreateWorkflowArgs } from "./args";
import { formatCreateWorkflowResult } from "./format";
import { createDevosWorkflow } from "./scaffold";

if (import.meta.main) {
	try {
		const { json, ...options } = parseCreateWorkflowArgs(process.argv.slice(2));
		const result = await createDevosWorkflow(options);
		process.stdout.write(formatCreateWorkflowResult(result, json));
	} catch (error) {
		process.stderr.write(
			`${error instanceof Error ? error.message : String(error)}\n`,
		);
		process.exitCode = 1;
	}
}

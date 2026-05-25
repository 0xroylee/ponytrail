import type { CreateDevosWorkflowResult } from "./types/workflow.types";

export function formatCreateWorkflowResult(
	result: CreateDevosWorkflowResult,
	json: boolean,
): string {
	if (json) return `${JSON.stringify(result, null, "\t")}\n`;
	return `Created workflow at ${result.workflowPath}\n`;
}

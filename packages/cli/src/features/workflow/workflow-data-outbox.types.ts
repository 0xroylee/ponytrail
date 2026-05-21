import type { WorkflowDataAction } from "devos-server/workflow-data";

export interface WorkflowDataOutboxContext {
	workspacePath: string;
	projectId: string;
}

export interface WorkflowDataOutboxEntry {
	id: string;
	action: WorkflowDataAction;
	payload?: unknown;
	createdAt: string;
	attempts: number;
	lastError?: string;
}

export interface WorkflowDataOutboxDrainResult {
	attempted: number;
	sent: number;
	remaining: number;
	error?: string;
}

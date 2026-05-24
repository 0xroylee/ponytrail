import {
	WORKFLOW_PROGRESS_SCHEMA,
	type WorkflowProgressEvent,
	type WorkflowProgressEventInput,
} from "./types/workflow-progress.types";

export const WORKFLOW_PROGRESS_SENTINEL = "__DEVOS_WORKFLOW_PROGRESS__";
export type WorkflowProgressListener = (
	event: WorkflowProgressEvent,
) => void | Promise<void>;

const progressListeners = new Set<WorkflowProgressListener>();

export function addWorkflowProgressListener(
	listener: WorkflowProgressListener,
): () => void {
	progressListeners.add(listener);
	return () => progressListeners.delete(listener);
}

export function buildWorkflowProgressEvent(
	input: WorkflowProgressEventInput,
	now: () => string = () => new Date().toISOString(),
): WorkflowProgressEvent {
	return {
		...input,
		schema: WORKFLOW_PROGRESS_SCHEMA,
		emittedAt: now(),
	} as WorkflowProgressEvent;
}

export function serializeWorkflowProgressEvent(
	event: WorkflowProgressEvent,
): string {
	return `${WORKFLOW_PROGRESS_SENTINEL}${JSON.stringify(event)}\n`;
}

export function emitWorkflowProgress(
	input: WorkflowProgressEventInput,
	write: (text: string) => void = (text) => process.stdout.write(text),
): void {
	const event = buildWorkflowProgressEvent(input);
	notifyWorkflowProgressListeners(event);
	if (process.env.DEVOS_WORKFLOW_PROGRESS_STREAM !== "1") {
		return;
	}
	write(serializeWorkflowProgressEvent(event));
}

function notifyWorkflowProgressListeners(event: WorkflowProgressEvent): void {
	for (const listener of progressListeners) {
		try {
			void Promise.resolve(listener(event)).catch(() => {});
		} catch {}
	}
}

export function parseWorkflowProgressLine(
	line: string,
):
	| { status: "ignored" }
	| { status: "ok"; event: WorkflowProgressEvent }
	| { status: "error"; error: string } {
	if (!line.startsWith(WORKFLOW_PROGRESS_SENTINEL)) {
		return { status: "ignored" };
	}
	try {
		const event = JSON.parse(
			line.slice(WORKFLOW_PROGRESS_SENTINEL.length),
		) as unknown;
		return isWorkflowProgressEvent(event)
			? { status: "ok", event }
			: { status: "error", error: "Malformed workflow progress event" };
	} catch (error) {
		return {
			status: "error",
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function isWorkflowProgressEvent(
	value: unknown,
): value is WorkflowProgressEvent {
	if (!isRecord(value)) {
		return false;
	}
	return (
		value.schema === WORKFLOW_PROGRESS_SCHEMA &&
		typeof value.emittedAt === "string" &&
		typeof value.kind === "string"
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

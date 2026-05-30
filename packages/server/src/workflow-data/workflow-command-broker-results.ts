import type {
	CliCommandExecutionResult,
	CliCommandRequest,
	CliCommandStreamEmit,
} from "devos/features/server";
import type { WorkflowCommandStreamFrame } from "./types/workflow-socket-frame.types";

export function failedResult(
	request: CliCommandRequest,
	error: string,
): CliCommandExecutionResult {
	return { status: "failed", request, error };
}

export function toCommandStreamEvent(
	frame: WorkflowCommandStreamFrame,
): Parameters<CliCommandStreamEmit>[0] {
	const { requestId: _requestId, ...event } = frame;
	return event as Parameters<CliCommandStreamEmit>[0];
}

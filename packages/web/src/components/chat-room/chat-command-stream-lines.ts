import type { CliCommandStreamEvent } from "@/lib/api";
import type { ChatStreamLine } from "./types/chat-room.types";

export function streamLineFromCommandEvent(
	event: CliCommandStreamEvent,
): ChatStreamLine | null {
	if (event.type === "start") {
		return createStreamLine("system", "Workflow rerun started.");
	}
	if (event.type === "stdout" || event.type === "stderr") {
		const text = event.text.trimEnd();
		return text ? createStreamLine(event.type, text) : null;
	}
	if (event.type === "progress") {
		const text =
			event.event.message ?? event.event.detail ?? event.event.error ?? null;
		return text ? createStreamLine("system", text) : null;
	}
	if (event.type === "error") {
		return createStreamLine("stderr", event.error);
	}
	return createStreamLine("system", `Workflow ${event.result.status}.`);
}

export function createStreamLine(
	stream: ChatStreamLine["stream"],
	text: string,
): ChatStreamLine {
	return { id: crypto.randomUUID(), stream, text };
}

import { WebSocket } from "ws";
import type { WorkflowDataSocket } from "./types/workflow-data-socket.types";
import type { WorkflowPingFrame } from "./types/workflow-socket-frame.types";

const DEFAULT_RUNTIME_PING_TIMEOUT_MS = 1000;

export function createWorkflowRuntimePing(
	timeoutMs = DEFAULT_RUNTIME_PING_TIMEOUT_MS,
) {
	const pending = new Map<
		string,
		{ resolve(value: boolean): void; timeout: ReturnType<typeof setTimeout> }
	>();
	return {
		failAll() {
			for (const requestId of pending.keys()) {
				settle(requestId, false);
			}
		},
		handlePong(requestId: string): boolean {
			return settle(requestId, true);
		},
		ping(socket: WorkflowDataSocket | undefined): Promise<boolean> {
			if (!socket || socket.readyState !== WebSocket.OPEN) {
				return Promise.resolve(false);
			}
			const requestId = crypto.randomUUID();
			return new Promise((resolve) => {
				const timeout = setTimeout(() => settle(requestId, false), timeoutMs);
				pending.set(requestId, { resolve, timeout });
				try {
					socket.send(
						JSON.stringify({
							type: "ping",
							requestId,
						} satisfies WorkflowPingFrame),
					);
				} catch {
					settle(requestId, false);
				}
			});
		},
	};

	function settle(requestId: string, value: boolean): boolean {
		const entry = pending.get(requestId);
		if (!entry) {
			return false;
		}
		pending.delete(requestId);
		clearTimeout(entry.timeout);
		entry.resolve(value);
		return true;
	}
}

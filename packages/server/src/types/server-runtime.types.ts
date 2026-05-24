import type { Server } from "node:http";
import type { ServerDatabase } from "devos-db";
import type { WorkflowDataSocketProxy } from "../workflow-data/types/workflow-data-socket.types";
import type { RealtimeEventsProxy } from "../ws/types/realtime-events.types";

export type ServerShutdownSignal = "SIGINT" | "SIGTERM";

export interface ServerRuntime {
	server: Server;
	close(): Promise<void>;
}

export interface ServerRuntimeOptions {
	server: Server;
	serverDatabase: ServerDatabase;
	realtimeEventsSocket: RealtimeEventsProxy;
	workflowDataSocket: WorkflowDataSocketProxy;
	logger?: ServerRuntimeLogger;
}

export interface ServerRuntimeLogger {
	error(context: Record<string, unknown>, message: string): void;
	info?(context: Record<string, unknown>, message: string): void;
}

export interface ServerSignalTarget {
	on(signal: ServerShutdownSignal, listener: () => void): this;
	off(signal: ServerShutdownSignal, listener: () => void): this;
}

export interface ServerShutdownHandlersOptions {
	exit?: (code: number) => void;
	logger?: ServerRuntimeLogger;
	signalTarget?: ServerSignalTarget;
}

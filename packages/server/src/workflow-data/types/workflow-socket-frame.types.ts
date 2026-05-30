import type { WorkflowComputerRegistration } from "./workflow-computer.types";
import type {
	WorkflowCliCommandRequest,
	WorkflowCliCommandStreamEvent,
	WorkflowDataRequestFrame,
	WorkflowDataResponseFrame,
} from "./workflow-data.types";

export interface WorkflowPingFrame {
	type: "ping";
	requestId: string;
}

export interface WorkflowPongFrame {
	type: "pong";
	requestId: string;
}

export interface WorkflowClientCommandFrame {
	type: "command";
	requestId: string;
	request: WorkflowCliCommandRequest;
}

export interface WorkflowWorkerReadyFrame {
	type: "cli.worker.ready";
	workerId: string;
	computer?: WorkflowComputerRegistration;
}

export interface WorkflowWorkerDispatchFrame {
	type: "cli.dispatch";
	requestId: string;
	request: WorkflowCliCommandRequest;
}

export type WorkflowCommandStreamFrame = WorkflowCliCommandStreamEvent & {
	requestId: string;
};

export type WorkflowSocketInboundFrame =
	| WorkflowDataRequestFrame
	| WorkflowPingFrame
	| WorkflowPongFrame
	| WorkflowClientCommandFrame
	| WorkflowWorkerReadyFrame
	| WorkflowCommandStreamFrame;

export type WorkflowSocketOutboundFrame =
	| WorkflowDataResponseFrame
	| WorkflowPongFrame
	| WorkflowWorkerDispatchFrame
	| WorkflowCommandStreamFrame;

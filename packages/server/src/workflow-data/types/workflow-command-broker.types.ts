import type { CliCommandExecutionResult } from "devos/features/server";
import type { CliExecutor } from "../../types/app.types";
import type {
	RegisteredWorkflowComputer,
	WorkflowComputerRegistration,
} from "./workflow-computer.types";
import type { WorkflowDataSocket } from "./workflow-data-socket.types";
import type {
	WorkflowClientCommandFrame,
	WorkflowCommandStreamFrame,
	WorkflowPongFrame,
} from "./workflow-socket-frame.types";

export interface WorkflowCommandBroker extends CliExecutor {
	dispatchCommand(
		frame: WorkflowClientCommandFrame,
		emit: (frame: WorkflowCommandStreamFrame) => void,
	): Promise<CliCommandExecutionResult>;
	handleWorkerFrame(
		frame: WorkflowCommandStreamFrame | WorkflowPongFrame,
	): void;
	isRuntimeReachable(): Promise<boolean>;
	listComputers(): RegisteredWorkflowComputer[];
	registerWorker(
		socket: WorkflowDataSocket,
		workerId: string,
		computer?: WorkflowComputerRegistration,
	): void;
}

import type { LoadedConfig } from "devos/features/config";
import type {
	CliCommandExecutionResult,
	CliCommandRequest,
} from "devos/features/server";
import type { CliExecutor } from "../../app.types";
import type { ServerLogger } from "../../logger.types";

export interface LinearTaskPollingSchedulerOptions {
	config: LoadedConfig;
	cliExecutor: CliExecutor;
	logger: ServerLogger;
}

export interface LinearTaskPollingSchedulerDeps {
	setIntervalFn?: (
		handler: () => void,
		timeoutMs: number,
	) => LinearTaskPollingIntervalHandle;
	clearIntervalFn?: (handle: LinearTaskPollingIntervalHandle) => void;
}

export type LinearTaskPollingIntervalHandle = ReturnType<typeof setInterval>;

export type LinearTaskPollingDispatchRequest = Extract<
	CliCommandRequest,
	{ action: "run" }
> & {
	allProjects: true;
	poll: true;
	maxPollCycles: 1;
};

export interface LinearTaskPollingScheduler {
	stop: () => void;
}

export type LinearTaskPollingDispatchResult = CliCommandExecutionResult;

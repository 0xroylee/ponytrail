import { normalizeError } from "../../logger";
import type {
	LinearTaskPollingDispatchRequest,
	LinearTaskPollingScheduler,
	LinearTaskPollingSchedulerDeps,
	LinearTaskPollingSchedulerOptions,
} from "./polling.types";

const SINGLE_CYCLE_DISPATCH_REQUEST: LinearTaskPollingDispatchRequest = {
	action: "run",
	allProjects: true,
	poll: true,
	maxPollCycles: 1,
};

export function startLinearTaskPollingScheduler(
	options: LinearTaskPollingSchedulerOptions,
	deps: LinearTaskPollingSchedulerDeps = {},
): LinearTaskPollingScheduler {
	const intervalMs = options.config.polling.intervalMs;
	const setIntervalFn = deps.setIntervalFn ?? setInterval;
	const clearIntervalFn = deps.clearIntervalFn ?? clearInterval;
	let stopped = false;
	let inFlight = false;

	const runTick = async (): Promise<void> => {
		if (stopped) {
			return;
		}
		if (inFlight) {
			options.logger.info(
				{ intervalMs },
				"Skipping overlapping server Linear polling tick",
			);
			return;
		}

		inFlight = true;
		try {
			const result = await options.cliExecutor.execute(
				SINGLE_CYCLE_DISPATCH_REQUEST,
			);
			if (result.status !== "succeeded") {
				options.logger.error(
					{
						intervalMs,
						status: result.status,
						error: result.error,
					},
					"Server Linear polling dispatch returned non-success status",
				);
			}
		} catch (error) {
			options.logger.error(
				{
					intervalMs,
					err: normalizeError(error),
				},
				"Server Linear polling dispatch failed",
			);
		} finally {
			inFlight = false;
		}
	};

	const intervalHandle = setIntervalFn(() => {
		void runTick();
	}, intervalMs);

	options.logger.info(
		{ intervalMs },
		"Server Linear polling scheduler started",
	);
	void runTick();

	return {
		stop: () => {
			if (stopped) {
				return;
			}
			stopped = true;
			clearIntervalFn(intervalHandle);
			options.logger.info(
				{ intervalMs },
				"Server Linear polling scheduler stopped",
			);
		},
	};
}

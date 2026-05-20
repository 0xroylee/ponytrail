import type {
	DaemonReadinessHandle,
	DaemonReadinessOptions,
	DaemonReadinessScheduler,
} from "./daemon.types";

export const DAEMON_READY_DELAY_MS = 60_000;
export const DAEMON_READY_MESSAGE = "All ready\n";

export function scheduleDaemonReadyMessage(
	options: DaemonReadinessOptions = {},
): DaemonReadinessHandle {
	const write = options.write ?? process.stdout.write.bind(process.stdout);
	const message = options.message ?? DAEMON_READY_MESSAGE;
	const delayMs = options.delayMs ?? DAEMON_READY_DELAY_MS;
	const scheduler = options.scheduler ?? scheduleTimeout;
	return scheduler(() => write(message), delayMs);
}

const scheduleTimeout: DaemonReadinessScheduler = (callback, delayMs) => {
	const timeout = setTimeout(callback, delayMs);
	return {
		cancel: () => clearTimeout(timeout),
	};
};

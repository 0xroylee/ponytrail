import type { Server } from "node:http";
import { normalizeError } from "./logger";
import type {
	ServerRuntime,
	ServerRuntimeOptions,
	ServerShutdownHandlersOptions,
	ServerShutdownSignal,
} from "./server-runtime.types";

const SHUTDOWN_SIGNALS: ServerShutdownSignal[] = ["SIGINT", "SIGTERM"];

export function createServerRuntime(
	options: ServerRuntimeOptions,
): ServerRuntime {
	let closePromise: Promise<void> | undefined;
	let closeResourcesPromise: Promise<void> | undefined;

	const closeResources = () => {
		closeResourcesPromise ??= closeRuntimeResources(options);
		return closeResourcesPromise;
	};

	options.server.once("close", () => {
		void closeResources().catch((error) => {
			options.logger?.error(
				{ err: normalizeError(error) },
				"Server resource cleanup failed",
			);
		});
	});

	return {
		server: options.server,
		close() {
			closePromise ??= (async () => {
				let serverCloseError: unknown;
				try {
					await closeHttpServer(options.server);
				} catch (error) {
					serverCloseError = error;
				}
				try {
					await closeResources();
				} catch (error) {
					if (serverCloseError) {
						throw new AggregateError(
							[serverCloseError, error],
							"Server shutdown failed",
						);
					}
					throw error;
				}
				if (serverCloseError) {
					throw serverCloseError;
				}
			})();
			return closePromise;
		},
	};
}

export function installServerShutdownHandlers(
	runtime: ServerRuntime,
	options: ServerShutdownHandlersOptions = {},
): () => void {
	const signalTarget = options.signalTarget ?? process;
	const exit = options.exit ?? process.exit;
	let isShuttingDown = false;

	const handlers = Object.fromEntries(
		SHUTDOWN_SIGNALS.map((signal) => [
			signal,
			() => {
				if (isShuttingDown) return;
				isShuttingDown = true;
				removeHandlers(signalTarget, handlers);
				void closeRuntimeForSignal(runtime, signal, options).then(exit);
			},
		]),
	) as Record<ServerShutdownSignal, () => void>;

	for (const signal of SHUTDOWN_SIGNALS) {
		signalTarget.on(signal, handlers[signal]);
	}

	return () => removeHandlers(signalTarget, handlers);
}

async function closeRuntimeForSignal(
	runtime: ServerRuntime,
	signal: ServerShutdownSignal,
	options: ServerShutdownHandlersOptions,
): Promise<number> {
	options.logger?.info?.({ signal }, "Shutting down server");
	try {
		await runtime.close();
		return 0;
	} catch (error) {
		options.logger?.error?.(
			{ err: normalizeError(error), signal },
			"Server shutdown failed",
		);
		return 1;
	}
}

async function closeRuntimeResources(
	options: ServerRuntimeOptions,
): Promise<void> {
	const results = await Promise.allSettled([
		options.realtimeEventsSocket.close(),
		options.workflowDataSocket.close(),
		options.serverDatabase.close(),
	]);
	const failures = results.filter(
		(result): result is PromiseRejectedResult => result.status === "rejected",
	);
	if (failures.length === 0) {
		return;
	}
	throw new AggregateError(
		failures.map((failure) => failure.reason),
		"Server resource cleanup failed",
	);
}

function closeHttpServer(server: Server): Promise<void> {
	if (!server.listening) {
		return Promise.resolve();
	}
	return new Promise((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
}

function removeHandlers(
	signalTarget: ServerShutdownHandlersOptions["signalTarget"],
	handlers: Record<ServerShutdownSignal, () => void>,
): void {
	for (const signal of SHUTDOWN_SIGNALS) {
		signalTarget?.off(signal, handlers[signal]);
	}
}

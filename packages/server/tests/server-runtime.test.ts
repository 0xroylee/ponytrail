import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import type { Server } from "node:http";
import {
	createServerRuntime,
	installServerShutdownHandlers,
} from "../src/server-runtime";
import type {
	ServerRuntime,
	ServerShutdownSignal,
	ServerSignalTarget,
} from "../src/types/server-runtime.types";

describe("server runtime shutdown", () => {
	it("closes the HTTP server, websocket proxies, and database exactly once", async () => {
		const harness = createRuntimeHarness();

		await Promise.all([harness.runtime.close(), harness.runtime.close()]);

		expect(harness.server.closeCalls).toBe(1);
		expect(harness.realtimeEventsSocket.calls).toBe(1);
		expect(harness.workflowDataSocket.calls).toBe(1);
		expect(harness.serverDatabase.calls).toBe(1);
	});

	it("closes resources when compatibility callers close the returned server", async () => {
		const harness = createRuntimeHarness();

		await new Promise<void>((resolve) => {
			harness.server.close(() => resolve());
		});
		await harness.runtime.close();

		expect(harness.server.closeCalls).toBe(1);
		expect(harness.realtimeEventsSocket.calls).toBe(1);
		expect(harness.workflowDataSocket.calls).toBe(1);
		expect(harness.serverDatabase.calls).toBe(1);
	});

	it("still closes resources when HTTP server close fails", async () => {
		const closeError = new Error("close failed");
		const harness = createRuntimeHarness({ closeError });

		await expect(harness.runtime.close()).rejects.toBe(closeError);

		expect(harness.realtimeEventsSocket.calls).toBe(1);
		expect(harness.workflowDataSocket.calls).toBe(1);
		expect(harness.serverDatabase.calls).toBe(1);
	});

	it("waits for runtime shutdown before exiting after a process signal", async () => {
		const signalTarget = new FakeSignalTarget();
		const shutdown = deferred<void>();
		const order: string[] = [];
		const runtime: ServerRuntime = {
			server: {} as Server,
			close: () => {
				order.push("close");
				return shutdown.promise;
			},
		};
		const exitCodes: number[] = [];

		installServerShutdownHandlers(runtime, {
			exit: (code) => {
				order.push("exit");
				exitCodes.push(code);
			},
			signalTarget,
		});

		signalTarget.emit("SIGTERM");
		await flushAsyncWork();
		expect(exitCodes).toEqual([]);

		shutdown.resolve();
		await flushAsyncWork();

		expect(exitCodes).toEqual([0]);
		expect(order).toEqual(["close", "exit"]);
	});
});

class FakeServer extends EventEmitter {
	listening = true;
	closeCalls = 0;

	constructor(private readonly closeError?: Error) {
		super();
	}

	close(callback?: (error?: Error) => void): this {
		this.closeCalls += 1;
		this.listening = false;
		queueMicrotask(() => {
			this.emit("close");
			callback?.(this.closeError);
		});
		return this;
	}
}

class FakeSignalTarget extends EventEmitter implements ServerSignalTarget {
	on(signal: ServerShutdownSignal, listener: () => void): this {
		return super.on(signal, listener);
	}

	off(signal: ServerShutdownSignal, listener: () => void): this {
		return super.off(signal, listener);
	}
}

function createRuntimeHarness(options: { closeError?: Error } = {}) {
	const server = new FakeServer(options.closeError);
	const realtimeEventsSocket = createCloseCounter();
	const workflowDataSocket = createCloseCounter();
	const serverDatabase = createCloseCounter();
	const runtime = createServerRuntime({
		server: server as unknown as Server,
		realtimeEventsSocket: realtimeEventsSocket.value,
		workflowDataSocket: workflowDataSocket.value,
		serverDatabase: serverDatabase.value,
	});
	return {
		realtimeEventsSocket,
		runtime,
		server,
		serverDatabase,
		workflowDataSocket,
	};
}

function createCloseCounter() {
	let calls = 0;
	return {
		get calls() {
			return calls;
		},
		value: {
			close: async () => {
				calls += 1;
			},
		} as never,
	};
}

function deferred<T>() {
	let resolve: (value: T | PromiseLike<T>) => void = () => {};
	const promise = new Promise<T>((innerResolve) => {
		resolve = innerResolve;
	});
	return { promise, resolve };
}

async function flushAsyncWork(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

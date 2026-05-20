import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import {
	type CliCommandDaemon,
	DAEMON_READY_DELAY_MS,
	DAEMON_READY_MESSAGE,
	type DaemonChild,
	type DaemonReadinessScheduler,
	type DaemonSignalTarget,
	type DaemonSpawn,
	runCliCommandDaemonOnly,
	runProductionDaemon,
} from "../src/features/daemon";

describe("daemon delayed readiness", () => {
	it("prints all ready for cli-only daemon after the readiness delay", async () => {
		const signalTarget = new FakeSignalTarget();
		const readiness = createReadinessHarness();
		const messages: string[] = [];
		const commandDaemon = createCommandDaemonHarness();
		const done = runCliCommandDaemonOnly({
			cwd: "/repo",
			readinessScheduler: readiness.scheduler,
			signalTarget,
			startCommandDaemon: commandDaemon.start,
			write: (message) => messages.push(message),
		});

		expect(readiness.delayMs).toBe(DAEMON_READY_DELAY_MS);
		expect(messages).toEqual([
			"CLI daemon websocket listening on ws://127.0.0.1:4103\n",
		]);

		readiness.fire();
		expect(messages).toContain(DAEMON_READY_MESSAGE);

		signalTarget.emitSignal("SIGTERM");
		await expect(done).resolves.toBe(0);
	});

	it("cancels cli-only delayed readiness on shutdown", async () => {
		const signalTarget = new FakeSignalTarget();
		const readiness = createReadinessHarness();
		const messages: string[] = [];
		const commandDaemon = createCommandDaemonHarness();
		const done = runCliCommandDaemonOnly({
			cwd: "/repo",
			readinessScheduler: readiness.scheduler,
			signalTarget,
			startCommandDaemon: commandDaemon.start,
			write: (message) => messages.push(message),
		});

		signalTarget.emitSignal("SIGINT");
		await expect(done).resolves.toBe(0);

		expect(readiness.cancelled).toBe(true);
		readiness.fire();
		expect(messages).not.toContain(DAEMON_READY_MESSAGE);
	});

	it("prints all ready for production daemon after the readiness delay", async () => {
		const harness = createProductionHarness();
		const readiness = createReadinessHarness();
		const messages: string[] = [];
		const done = runProductionDaemon({
			cwd: "/repo",
			env: {},
			readinessScheduler: readiness.scheduler,
			signalTarget: harness.signalTarget,
			spawnChild: harness.spawnChild,
			startCommandDaemon: harness.startCommandDaemon,
			write: (message) => messages.push(message),
		});

		expect(readiness.delayMs).toBe(DAEMON_READY_DELAY_MS);
		expect(messages).toEqual([]);

		readiness.fire();
		expect(messages).toEqual([DAEMON_READY_MESSAGE]);

		harness.children[0]?.emit("close", 0, null);
		await expect(done).resolves.toBe(0);
	});

	it("cancels production delayed readiness on shutdown", async () => {
		const harness = createProductionHarness();
		const readiness = createReadinessHarness();
		const messages: string[] = [];
		const done = runProductionDaemon({
			cwd: "/repo",
			env: {},
			readinessScheduler: readiness.scheduler,
			signalTarget: harness.signalTarget,
			spawnChild: harness.spawnChild,
			startCommandDaemon: harness.startCommandDaemon,
			write: (message) => messages.push(message),
		});

		harness.signalTarget.emitSignal("SIGTERM");
		await expect(done).resolves.toBe(0);

		expect(readiness.cancelled).toBe(true);
		readiness.fire();
		expect(messages).toEqual([]);
	});
});

function createReadinessHarness(): {
	cancelled: boolean;
	delayMs: number | undefined;
	fire(): void;
	scheduler: DaemonReadinessScheduler;
} {
	const harness = {
		callback: undefined as (() => void) | undefined,
		cancelled: false,
		delayMs: undefined as number | undefined,
		fire() {
			if (!harness.cancelled) {
				harness.callback?.();
			}
		},
		scheduler: (callback: () => void, delayMs: number) => {
			harness.callback = callback;
			harness.delayMs = delayMs;
			return {
				cancel: () => {
					harness.cancelled = true;
				},
			};
		},
	};
	return harness;
}

function createCommandDaemonHarness(): {
	start: (options: {
		cwd: string;
		env?: NodeJS.ProcessEnv;
	}) => CliCommandDaemon;
} {
	return {
		start: () => ({
			port: 4103,
			stop: async () => {},
		}),
	};
}

function createProductionHarness(): {
	children: FakeDaemonChild[];
	signalTarget: FakeSignalTarget;
	spawnChild: DaemonSpawn;
	startCommandDaemon: (options: {
		cwd: string;
		env?: NodeJS.ProcessEnv;
	}) => CliCommandDaemon;
} {
	const children: FakeDaemonChild[] = [];
	return {
		children,
		signalTarget: new FakeSignalTarget(),
		spawnChild: () => {
			const child = new FakeDaemonChild();
			children.push(child);
			return child;
		},
		startCommandDaemon: () => ({
			port: 3002,
			stop: async () => {},
		}),
	};
}

class FakeDaemonChild extends EventEmitter implements DaemonChild {
	killed = false;

	kill(): boolean {
		this.killed = true;
		return true;
	}
}

class FakeSignalTarget implements DaemonSignalTarget {
	private readonly emitter = new EventEmitter();

	on(signal: NodeJS.Signals, listener: () => void): void {
		this.emitter.on(signal, listener);
	}

	off(signal: NodeJS.Signals, listener: () => void): void {
		this.emitter.off(signal, listener);
	}

	emitSignal(signal: NodeJS.Signals): void {
		this.emitter.emit(signal);
	}
}

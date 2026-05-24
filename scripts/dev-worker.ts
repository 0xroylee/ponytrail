import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";

const DEFAULT_SERVER_BASE_URL = "http://127.0.0.1:3001";
const DEFAULT_WORKFLOW_WS_URL = "ws://127.0.0.1:3001/api/workflow";

export interface DevWorkerCommand {
	name: string;
	command: string;
	args: string[];
	env: NodeJS.ProcessEnv;
}

export interface DevWorkerSpawnOptions {
	cwd: string;
	env: NodeJS.ProcessEnv;
	stdio: "inherit";
}

export interface DevWorkerChild {
	killed: boolean;
	kill(signal?: NodeJS.Signals): boolean;
	on(event: "exit", listener: DevWorkerExitListener): this;
	on(event: "error", listener: DevWorkerErrorListener): this;
}

export type DevWorkerExitListener = (
	code: number | null,
	signal: NodeJS.Signals | null,
) => void;

export type DevWorkerErrorListener = (error: Error) => void;

export type DevWorkerSpawn = (
	command: string,
	args: string[],
	options: DevWorkerSpawnOptions,
) => DevWorkerChild;

export interface DevWorkerSignalTarget {
	on(event: "SIGINT" | "SIGTERM", listener: () => void): this;
	off(event: "SIGINT" | "SIGTERM", listener: () => void): this;
}

export interface RunDevWorkerOptions {
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	spawnChild?: DevWorkerSpawn;
	signalTarget?: DevWorkerSignalTarget;
}

export function buildDevWorkerCommands(
	env: NodeJS.ProcessEnv = process.env,
): DevWorkerCommand[] {
	const baseEnv = buildDevWorkerBaseEnv(env);
	return [
		{
			name: "workflow-worker",
			command: "bun",
			args: ["run", "./packages/cli/src/index.ts", "workflow-worker"],
			env: baseEnv,
		},
		{
			name: "workflow-poller",
			command: "bun",
			args: ["run", "./packages/cli/src/index.ts", "run", "--poll-forever"],
			env: {
				...baseEnv,
				DEVOS_WORKFLOW_PROGRESS_STREAM: "1",
			},
		},
	];
}

export function buildDevWorkerBaseEnv(
	env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
	return {
		...env,
		DEVOS_SERVER_BASE_URL: env.DEVOS_SERVER_BASE_URL ?? DEFAULT_SERVER_BASE_URL,
		DEVOS_WORKFLOW_WS_URL: env.DEVOS_WORKFLOW_WS_URL ?? DEFAULT_WORKFLOW_WS_URL,
	};
}

export function runDevWorker(
	options: RunDevWorkerOptions = {},
): Promise<number> {
	const cwd = options.cwd ?? process.cwd();
	const env = options.env ?? process.env;
	const spawnChild = options.spawnChild ?? spawnDevWorkerChild;
	const signalTarget = options.signalTarget ?? process;
	const children = buildDevWorkerCommands(env).map((service) =>
		spawnChild(service.command, service.args, {
			cwd,
			env: service.env,
			stdio: "inherit",
		}),
	);
	let isShuttingDown = false;

	return new Promise((resolve) => {
		let resolved = false;
		const complete = (code: number) => {
			if (resolved) {
				return;
			}
			resolved = true;
			signalTarget.off("SIGINT", handleSigint);
			signalTarget.off("SIGTERM", handleSigterm);
			resolve(code);
		};
		const shutdown = (signal: NodeJS.Signals, code: number) => {
			if (isShuttingDown) {
				return;
			}
			isShuttingDown = true;
			stopChildren(children, signal);
			complete(code);
		};
		const handleSigint = () => shutdown("SIGINT", 0);
		const handleSigterm = () => shutdown("SIGTERM", 0);

		signalTarget.on("SIGINT", handleSigint);
		signalTarget.on("SIGTERM", handleSigterm);

		for (const child of children) {
			child.on("exit", (code, signal) => {
				if (isShuttingDown) {
					return;
				}
				shutdown("SIGTERM", code ?? (signal ? 1 : 0));
			});
			child.on("error", () => shutdown("SIGTERM", 1));
		}
	});
}

function stopChildren(
	children: DevWorkerChild[],
	signal: NodeJS.Signals,
): void {
	for (const child of children) {
		if (!child.killed) {
			child.kill(signal);
		}
	}
}

const spawnDevWorkerChild: DevWorkerSpawn = (command, args, options) =>
	spawn(command, args, options) as ChildProcess;

if (import.meta.main) {
	process.exitCode = await runDevWorker();
}

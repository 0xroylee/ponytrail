import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import {
	type DevWorkerChild,
	type DevWorkerSignalTarget,
	type DevWorkerSpawnOptions,
	buildDevWorkerCommands,
	runDevWorker,
} from "../../../scripts/dev-worker";

describe("dev worker script", () => {
	it("starts the workflow command worker and continuous poller", () => {
		const commands = buildDevWorkerCommands({});

		expect(
			commands.map((command) => ({
				name: command.name,
				command: command.command,
				args: command.args,
			})),
		).toEqual([
			{
				name: "workflow-worker",
				command: "bun",
				args: ["run", "./packages/cli/src/index.ts", "workflow-worker"],
			},
			{
				name: "workflow-poller",
				command: "bun",
				args: ["run", "./packages/cli/src/index.ts", "run", "--poll-forever"],
			},
		]);
		expect(commands[0]?.env.DEVOS_SERVER_BASE_URL).toBe(
			"http://127.0.0.1:3001",
		);
		expect(commands[0]?.env.DEVOS_WORKFLOW_WS_URL).toBe(
			"ws://127.0.0.1:3001/api/workflow",
		);
		expect(commands[1]?.env.DEVOS_WORKFLOW_PROGRESS_STREAM).toBe("1");
	});

	it("preserves explicit server and workflow URL overrides", () => {
		const commands = buildDevWorkerCommands({
			DEVOS_SERVER_BASE_URL: "https://api.example.test",
			DEVOS_WORKFLOW_WS_URL: "wss://workflow.example.test/socket",
		});

		expect(
			commands.map((command) => command.env.DEVOS_SERVER_BASE_URL),
		).toEqual(["https://api.example.test", "https://api.example.test"]);
		expect(
			commands.map((command) => command.env.DEVOS_WORKFLOW_WS_URL),
		).toEqual([
			"wss://workflow.example.test/socket",
			"wss://workflow.example.test/socket",
		]);
	});

	it("stops the sibling process when a child exits", async () => {
		const harness = createDevWorkerHarness();
		const done = runDevWorker({
			cwd: "/repo",
			env: {},
			spawnChild: harness.spawnChild,
			signalTarget: harness.signalTarget,
		});

		expect(harness.calls).toHaveLength(2);
		expect(harness.calls[0]?.options).toMatchObject({
			cwd: "/repo",
			stdio: "inherit",
		});

		harness.children[0]?.emit("exit", 7, null);

		await expect(done).resolves.toBe(7);
		expect(harness.children[1]?.killCalls).toEqual(["SIGTERM"]);
	});

	it("stops both children on process signals", async () => {
		const harness = createDevWorkerHarness();
		const done = runDevWorker({
			cwd: "/repo",
			env: {},
			spawnChild: harness.spawnChild,
			signalTarget: harness.signalTarget,
		});

		harness.signalTarget.emit("SIGINT");

		await expect(done).resolves.toBe(0);
		expect(harness.children.map((child) => child.killCalls)).toEqual([
			["SIGINT"],
			["SIGINT"],
		]);
	});
});

function createDevWorkerHarness(): {
	calls: Array<{
		command: string;
		args: string[];
		options: DevWorkerSpawnOptions;
	}>;
	children: FakeDevWorkerChild[];
	signalTarget: FakeSignalTarget;
	spawnChild: (
		command: string,
		args: string[],
		options: DevWorkerSpawnOptions,
	) => DevWorkerChild;
} {
	const calls: Array<{
		command: string;
		args: string[];
		options: DevWorkerSpawnOptions;
	}> = [];
	const children: FakeDevWorkerChild[] = [];
	return {
		calls,
		children,
		signalTarget: new FakeSignalTarget(),
		spawnChild: (command, args, options) => {
			calls.push({ command, args, options });
			const child = new FakeDevWorkerChild();
			children.push(child);
			return child;
		},
	};
}

class FakeDevWorkerChild extends EventEmitter implements DevWorkerChild {
	readonly killCalls: Array<NodeJS.Signals | undefined> = [];
	killed = false;

	kill(signal?: NodeJS.Signals): boolean {
		this.killed = true;
		this.killCalls.push(signal);
		return true;
	}
}

class FakeSignalTarget extends EventEmitter implements DevWorkerSignalTarget {}

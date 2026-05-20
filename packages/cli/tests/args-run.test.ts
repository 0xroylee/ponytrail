import { describe, expect, it } from "bun:test";
import { parseArgs } from "../src/args";
import { expectCommanderError } from "./args-test-helpers";

describe("parseArgs run", () => {
	it("parses issue and project scopes", () => {
		expect(parseArgs(["bun", "devos", "run", "--issue", "ABC-1"])).toEqual({
			kind: "run",
			options: {
				issueArg: "ABC-1",
				projectId: undefined,
				allProjects: false,
				poll: false,
				pollForever: undefined,
				concurrency: undefined,
				exitWhenIdle: undefined,
				pollIntervalMs: undefined,
				maxPollCycles: undefined,
			},
		});
		expect(parseArgs(["bun", "devos", "run", "--project", "api"])).toEqual({
			kind: "run",
			options: {
				projectId: "api",
				allProjects: false,
				poll: false,
				pollForever: undefined,
				concurrency: undefined,
				exitWhenIdle: undefined,
				pollIntervalMs: undefined,
				maxPollCycles: undefined,
			},
		});
	});

	it("parses polling flags and numeric options", () => {
		const parsed = parseArgs([
			"bun",
			"devos",
			"run",
			"--poll",
			"--poll-interval-ms",
			"15000",
			"--max-poll-cycles",
			"20",
			"--concurrency",
			"2",
		]);

		expect(parsed).toEqual({
			kind: "run",
			options: {
				issueArg: undefined,
				projectId: undefined,
				allProjects: false,
				poll: true,
				pollForever: undefined,
				concurrency: 2,
				exitWhenIdle: undefined,
				pollIntervalMs: 15000,
				maxPollCycles: 20,
			},
		});
	});

	it("parses boolean run mode flags", () => {
		expect(
			parseArgs(["bun", "devos", "run", "--poll", "--no-exit-when-idle"]),
		).toEqual({
			kind: "run",
			options: {
				issueArg: undefined,
				projectId: undefined,
				allProjects: false,
				poll: true,
				pollForever: undefined,
				concurrency: undefined,
				exitWhenIdle: false,
				pollIntervalMs: undefined,
				maxPollCycles: undefined,
			},
		});
		expect(parseArgs(["bun", "devos", "run", "--isolated-worktrees"])).toEqual({
			kind: "run",
			options: {
				issueArg: undefined,
				projectId: undefined,
				allProjects: false,
				poll: false,
				pollForever: undefined,
				concurrency: undefined,
				exitWhenIdle: undefined,
				pollIntervalMs: undefined,
				maxPollCycles: undefined,
				isolatedWorktrees: true,
			},
		});
	});

	it("parses poll-forever as polling", () => {
		expect(parseArgs(["bun", "devos", "run", "--poll-forever"])).toEqual({
			kind: "run",
			options: {
				issueArg: undefined,
				projectId: undefined,
				allProjects: false,
				poll: true,
				pollForever: true,
				concurrency: undefined,
				exitWhenIdle: undefined,
				pollIntervalMs: undefined,
				maxPollCycles: undefined,
			},
		});
	});

	it("rejects invalid positive integer options", () => {
		for (const argv of [
			["bun", "devos", "run", "--poll-interval-ms", "0"],
			["bun", "devos", "run", "--max-poll-cycles", "-1"],
			["bun", "devos", "run", "--concurrency", "1.5"],
		]) {
			const result = expectCommanderError(argv);

			expect(result.error.message).toContain("must be a positive integer");
			expect(result.stderr).toContain("Usage: devos run [options]");
		}
	});

	it("rejects incompatible run scope and polling flags", () => {
		const projectScope = expectCommanderError([
			"bun",
			"devos",
			"run",
			"--project",
			"api",
			"--all-projects",
		]);
		const pollForever = expectCommanderError([
			"bun",
			"devos",
			"run",
			"--poll-forever",
			"--max-poll-cycles",
			"2",
		]);

		expect(projectScope.error.message).toBe(
			"run command cannot use --project with --all-projects",
		);
		expect(pollForever.error.message).toContain(
			"run command cannot use --poll-forever with --max-poll-cycles",
		);
	});
});

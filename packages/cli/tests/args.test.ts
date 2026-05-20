import { describe, expect, it } from "bun:test";
import { parseArgs } from "../src/args";
import { expectCommanderError } from "./args-test-helpers";

describe("parseArgs help and core commands", () => {
	it("prints root help when no command is provided", () => {
		const result = expectCommanderError(["bun", "devos"]);

		expect(result.error.exitCode).toBe(0);
		expect(result.stdout).toContain("Usage: devos [options] [command]");
		expect(result.stdout).toContain("run [options]");
		expect(result.stdout).toContain("help [command]");
		expect(result.stderr).toBe("");
	});

	it("prints root help for help flags and command", () => {
		const flagResult = expectCommanderError(["bun", "devos", "--help"]);
		const commandResult = expectCommanderError(["bun", "devos", "help"]);

		expect(flagResult.error.exitCode).toBe(0);
		expect(flagResult.stdout).toContain("Usage: devos [options] [command]");
		expect(commandResult.error.exitCode).toBe(0);
		expect(commandResult.stdout).toContain("Usage: devos [options] [command]");
	});

	it("prints subcommand help", () => {
		const result = expectCommanderError(["bun", "devos", "run", "--help"]);

		expect(result.error.exitCode).toBe(0);
		expect(result.stdout).toContain("Usage: devos run [options]");
		expect(result.stdout).toContain("--poll-forever");
	});

	it("parses status command", () => {
		const parsed = parseArgs([
			"bun",
			"devos",
			"status",
			"--project",
			"api",
			"--issue",
			"ABC-1",
		]);

		expect(parsed).toEqual({
			kind: "status",
			issueKey: "ABC-1",
			projectId: "api",
		});
	});

	it("rejects status without required project", () => {
		const result = expectCommanderError([
			"bun",
			"devos",
			"status",
			"--issue",
			"ABC-1",
		]);

		expect(result.error.message).toBe(
			"error: required option '--project <PROJECT_ID>' not specified",
		);
		expect(result.stderr).toContain("Usage: devos status [options]");
	});

	it("parses daemon command", () => {
		expect(parseArgs(["bun", "devos", "daemon"])).toEqual({
			kind: "daemon",
		});
	});

	it("parses onboard commands", () => {
		expect(parseArgs(["bun", "devos", "onboard"])).toEqual({
			kind: "onboard",
			check: false,
		});
		expect(parseArgs(["bun", "devos", "onboard", "--check"])).toEqual({
			kind: "onboard",
			check: true,
		});
	});

	it("parses projects command", () => {
		expect(parseArgs(["bun", "devos", "projects"])).toEqual({
			kind: "projects",
		});
	});

	it("rejects unknown commands", () => {
		const unknown = expectCommanderError([
			"bun",
			"devos",
			"unknown",
			"--option",
		]);
		const legacySetup = expectCommanderError(["bun", "devos", "setup"]);

		expect(unknown.error.message).toBe("error: unknown command 'unknown'");
		expect(unknown.stderr).toContain("Usage: devos [options] [command]");
		expect(legacySetup.error.message).toContain(
			"error: unknown command 'setup'",
		);
	});
});

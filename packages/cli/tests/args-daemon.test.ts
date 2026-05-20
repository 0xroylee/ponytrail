import { describe, expect, it } from "bun:test";
import { CommanderError } from "commander";
import { parseArgs } from "../src/args";

function expectCommanderError(argv: string[]): {
	error: CommanderError;
	stderr: string;
} {
	let stderr = "";
	try {
		parseArgs(argv, {
			writeErr: (message) => {
				stderr += message;
			},
			writeOut: () => {},
		});
	} catch (error) {
		if (error instanceof CommanderError) {
			return { error, stderr };
		}
	}
	throw new Error(`Expected CommanderError for ${argv.join(" ")}`);
}

describe("parseArgs daemon", () => {
	it("parses daemon cli-only command", () => {
		expect(parseArgs(["bun", "devos", "daemon", "--cli-only"])).toEqual({
			kind: "daemon",
			cliOnly: true,
		});
	});

	it("parses daemon cli-only polling command", () => {
		expect(
			parseArgs([
				"bun",
				"devos",
				"daemon",
				"--cli-only",
				"--poll-forever",
				"--all-projects",
			]),
		).toEqual({
			kind: "daemon",
			cliOnly: true,
			pollForever: true,
			allProjects: true,
		});
	});

	it("rejects daemon polling flags without cli-only", () => {
		const result = expectCommanderError([
			"bun",
			"devos",
			"daemon",
			"--poll-forever",
		]);

		expect(result.error.message).toContain(
			"daemon polling flags require --cli-only",
		);
		expect(result.stderr).toContain("Usage: devos daemon [options]");
	});

	it("rejects all-projects without poll-forever", () => {
		const result = expectCommanderError([
			"bun",
			"devos",
			"daemon",
			"--cli-only",
			"--all-projects",
		]);

		expect(result.error.message).toBe(
			"daemon --all-projects requires --poll-forever",
		);
		expect(result.stderr).toContain("Usage: devos daemon [options]");
	});
});

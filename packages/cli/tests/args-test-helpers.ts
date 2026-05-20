import { CommanderError } from "commander";
import { type CliCommand, parseArgs } from "../src/args";

type CapturedParse =
	| { command: CliCommand; error?: undefined; stderr: string; stdout: string }
	| { command?: undefined; error: unknown; stderr: string; stdout: string };

export function captureParse(argv: string[]): CapturedParse {
	let stderr = "";
	let stdout = "";
	try {
		return {
			command: parseArgs(argv, {
				writeErr: (message) => {
					stderr += message;
				},
				writeOut: (message) => {
					stdout += message;
				},
			}),
			stderr,
			stdout,
		};
	} catch (error) {
		return { error, stderr, stdout };
	}
}

export function expectCommanderError(argv: string[]): {
	error: CommanderError;
	stderr: string;
	stdout: string;
} {
	const result = captureParse(argv);
	if (!(result.error instanceof CommanderError)) {
		throw new Error(`Expected CommanderError for ${argv.join(" ")}`);
	}
	return {
		error: result.error,
		stderr: result.stderr,
		stdout: result.stdout,
	};
}

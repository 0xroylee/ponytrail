import { describe, expect, it } from "bun:test";
import { parseArgs } from "../src/args";
import { expectCommanderError } from "./args-test-helpers";

describe("parseArgs task create", () => {
	it("parses explicit and stdin request markers", () => {
		expect(
			parseArgs([
				"bun",
				"devos",
				"task",
				"create",
				"--request",
				"Build a better setup flow",
				"--project",
				"default",
			]),
		).toEqual({
			kind: "task",
			command: {
				action: "create",
				request: "Build a better setup flow",
				projectId: "default",
				nonInteractive: undefined,
				maxClarificationRounds: undefined,
				clarificationAnswers: undefined,
				json: undefined,
			},
		});
		expect(
			parseArgs(["bun", "devos", "task", "create", "--request", "-"]),
		).toEqual({
			kind: "task",
			command: {
				action: "create",
				request: "-",
				projectId: undefined,
				nonInteractive: undefined,
				maxClarificationRounds: undefined,
				clarificationAnswers: undefined,
				json: undefined,
			},
		});
	});

	it("parses missing and positional request text", () => {
		expect(parseArgs(["bun", "devos", "task", "create"])).toEqual({
			kind: "task",
			command: {
				action: "create",
				request: undefined,
				projectId: undefined,
				nonInteractive: undefined,
				maxClarificationRounds: undefined,
				clarificationAnswers: undefined,
				json: undefined,
			},
		});
		expect(
			parseArgs([
				"bun",
				"devos",
				"task",
				"create",
				"Build",
				"a",
				"better",
				"setup",
				"flow",
			]),
		).toEqual({
			kind: "task",
			command: {
				action: "create",
				request: "Build a better setup flow",
				projectId: undefined,
				nonInteractive: undefined,
				maxClarificationRounds: undefined,
				clarificationAnswers: undefined,
				json: undefined,
			},
		});
	});

	it("parses non-interactive task create flags", () => {
		expect(
			parseArgs([
				"bun",
				"devos",
				"task",
				"create",
				"--request",
				"Build task flow",
				"--non-interactive",
				"--max-clarification-rounds",
				"2",
				"--clarifications-json",
				'[{"question":"Who?","answer":"CLI users"}]',
			]),
		).toEqual({
			kind: "task",
			command: {
				action: "create",
				request: "Build task flow",
				projectId: undefined,
				nonInteractive: true,
				maxClarificationRounds: 2,
				clarificationAnswers: [{ question: "Who?", answer: "CLI users" }],
				json: undefined,
			},
		});
	});

	it("rejects invalid task create clarifications json", () => {
		const result = expectCommanderError([
			"bun",
			"devos",
			"task",
			"create",
			"--request",
			"Build task flow",
			"--clarifications-json",
			"{bad",
		]);

		expect(result.error.message).toContain("must be valid JSON");
		expect(result.stderr).toContain("Usage: devos task create [options]");
	});
});

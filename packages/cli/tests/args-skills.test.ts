import { describe, expect, it } from "bun:test";
import { parseArgs } from "../src/args";
import { expectCommanderError } from "./args-test-helpers";

describe("parseArgs skills", () => {
	it("parses skills list command", () => {
		expect(parseArgs(["bun", "devos", "skills", "list"])).toEqual({
			kind: "skills",
			command: {
				action: "list",
				projectId: undefined,
			},
		});
	});

	it("parses skills add command", () => {
		expect(
			parseArgs([
				"bun",
				"devos",
				"skills",
				"add",
				"--title",
				"Backend Standard",
				"--description",
				"Rules",
				"--content",
				"Use consistent module boundaries.",
				"--project",
				"api",
			]),
		).toEqual({
			kind: "skills",
			command: {
				action: "add",
				title: "Backend Standard",
				description: "Rules",
				content: "Use consistent module boundaries.",
				projectId: "api",
			},
		});
	});

	it("parses skills update command", () => {
		expect(
			parseArgs([
				"bun",
				"devos",
				"skills",
				"update",
				"backend-standard",
				"--description",
				"Updated description",
			]),
		).toEqual({
			kind: "skills",
			command: {
				action: "update",
				name: "backend-standard",
				title: undefined,
				description: "Updated description",
				content: undefined,
				projectId: undefined,
			},
		});
	});

	it("parses skills remove command", () => {
		expect(
			parseArgs([
				"bun",
				"devos",
				"skills",
				"remove",
				"backend-standard",
				"--project",
				"default",
			]),
		).toEqual({
			kind: "skills",
			command: {
				action: "remove",
				name: "backend-standard",
				projectId: "default",
			},
		});
	});

	it("rejects skills add without required flags", () => {
		const result = expectCommanderError([
			"bun",
			"devos",
			"skills",
			"add",
			"--title",
			"t",
		]);

		expect(result.error.message).toBe(
			"error: required option '--description <TEXT>' not specified",
		);
	});

	it("rejects skills update without any fields", () => {
		const result = expectCommanderError([
			"bun",
			"devos",
			"skills",
			"update",
			"backend-standard",
		]);

		expect(result.error.message).toBe(
			"skills update requires at least one of --title, --description, or --content",
		);
	});

	it("rejects unknown skills action", () => {
		const result = expectCommanderError(["bun", "devos", "skills", "ship-it"]);

		expect(result.error.message).toBe("error: unknown command 'ship-it'");
		expect(result.stderr).toContain("Usage: devos skills [options] [command]");
	});
});

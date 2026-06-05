import { describe, expect, it } from "bun:test";
import type { AgentResult } from "../src";
import { CodexAdapter } from "../src/codex";
import { config } from "./fixtures";

describe("codex model compatibility", () => {
	it("maps legacy unsupported Codex models before command execution", async () => {
		const adapter = new CodexAdapter({
			...config,
			codex: {
				...config.codex,
				models: {
					...config.codex.models,
					implement: "gpt-5.3-codex",
					reviewTest: "gpt-5.2",
					githubComment: "gpt-5.3-codex",
				},
			},
		});
		const calls: string[][] = [];
		(
			adapter as unknown as {
				runCodex: (args: string[]) => Promise<AgentResult>;
			}
		).runCodex = async (args: string[]) => {
			calls.push(args);
			return { finalMessage: "", stdout: "" };
		};
		(
			adapter as unknown as { nextOutputFile: () => Promise<string> }
		).nextOutputFile = async () => "/tmp/out.txt";

		await adapter.resume("session-1", "implement prompt");
		await adapter.runReview("review prompt");
		await adapter.runGithubComment("comment prompt");

		expect(calls).toHaveLength(3);
		expect(calls.flat()).not.toContain("gpt-5.3-codex");
		expect(calls.flat()).not.toContain("gpt-5.2");
		expect(calls[0]).toContain("gpt-5.5");
		expect(calls[1]).toContain("gpt-5.5");
		expect(calls[2]).toContain("gpt-5.5");
	});
});

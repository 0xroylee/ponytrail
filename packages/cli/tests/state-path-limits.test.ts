import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { RunState } from "../src/features/types";
import { saveRunState, stateFilePath } from "../src/features/workflow/state";
import {
	agentChatLogPath,
	appendAgentChatLog,
} from "../src/features/workflow/state-chat-log";

describe("state path limits", () => {
	it("stores run state for long task identifiers without long file names", async () => {
		const cwd = await mkdtemp(path.join(os.tmpdir(), "devos-state-path-"));
		const longIssueKey = `TASK-${"A".repeat(320)}`;
		const state: RunState = {
			projectId: "default",
			projectName: "Default",
			workspacePath: cwd,
			repository: { owner: "owner", name: "repo", baseBranch: "main" },
			issue: {
				id: "task-1",
				key: longIssueKey,
				title: "Long task identifier",
				url: "https://example.test/task-1",
			},
			stage: "plan",
			bugs: [],
			startedAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await saveRunState(cwd, state);

		const file = stateFilePath(cwd, "default", longIssueKey);
		expect(path.basename(file).length).toBeLessThanOrEqual(255);
		const saved = JSON.parse(await readFile(file, "utf8")) as RunState;
		expect(saved.issue.key).toBe(longIssueKey);
	});

	it("stores agent chat logs for long skill paths without long file names", async () => {
		const cwd = await mkdtemp(path.join(os.tmpdir(), "devos-chat-path-"));
		const skillPath = `/Users/roy/${"deep-folder/".repeat(40)}SKILL.md`;

		await appendAgentChatLog(cwd, "default", {
			projectId: "default",
			issueKey: "TASK(OWNER)-1",
			issueId: "task-1",
			issueTitle: "Log agent chat",
			agentRole: "planning",
			skillPath,
			prompt: "prompt",
			finalMessage: "done",
			stdout: "",
			success: true,
			recordedAt: new Date().toISOString(),
		});

		const file = agentChatLogPath(cwd, "default", "planning", skillPath);
		expect(path.basename(file).length).toBeLessThanOrEqual(255);
		const entries = JSON.parse(await readFile(file, "utf8")) as unknown[];
		expect(entries).toHaveLength(1);
	});
});

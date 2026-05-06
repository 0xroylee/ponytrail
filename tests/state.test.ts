import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	createRunStateStore,
	loadRunState,
	normalizeIssueKey,
	stateFilePath,
	transitionStage,
} from "../src/state";
import type { RunState } from "../src/types";

const tempDirs: string[] = [];

afterEach(async () => {
	for (const dir of tempDirs.splice(0)) {
		await rm(dir, { recursive: true, force: true });
	}
});

function buildRunState(projectId: string, key: string): RunState {
	const now = new Date().toISOString();
	return {
		projectId,
		projectName: projectId,
		workspacePath: "/tmp/work",
		repository: {
			owner: "o",
			name: "n",
			baseBranch: "main",
		},
		issue: { id: "1", key, title: "t", url: "u" },
		stage: "planning",
		bugs: [],
		startedAt: now,
		updatedAt: now,
	};
}

describe("state helpers", () => {
	it("normalizes issue key from URL", () => {
		const key = normalizeIssueKey(
			"https://linear.app/acme/issue/ENG-321/task-name",
		);
		expect(key).toBe("ENG-321");
	});

	it("transitions stage", () => {
		const state = buildRunState("default", "ENG-1");
		const next = transitionStage(state, "implementing");
		expect(next.stage).toBe("implementing");
	});

	it("json store saves in project-scoped path", async () => {
		const cwd = await mkdtemp(path.join(os.tmpdir(), "piv-state-json-"));
		tempDirs.push(cwd);
		const store = createRunStateStore({
			workspacePath: cwd,
			stateStore: { type: "json" },
		});
		const state = buildRunState("proj-a", "ENG-2");

		await store.save(state);

		const file = stateFilePath(cwd, "proj-a", "ENG-2");
		const loaded = await Bun.file(file).json();
		expect(loaded.issue.key).toBe("ENG-2");
	});

	it("json store keeps legacy fallback for default project", async () => {
		const cwd = await mkdtemp(path.join(os.tmpdir(), "piv-state-legacy-"));
		tempDirs.push(cwd);
		await mkdir(path.join(cwd, ".piv-loop", "runs"), { recursive: true });
		const legacyState = buildRunState("default", "ENG-9");
		await writeFile(
			path.join(cwd, ".piv-loop", "runs", "ENG-9.json"),
			JSON.stringify(legacyState),
			"utf8",
		);

		const loaded = await loadRunState(cwd, "default", "ENG-9");
		expect(loaded?.issue.key).toBe("ENG-9");
	});

	it("sqlite store saves, loads, and lists by project", async () => {
		const cwd = await mkdtemp(path.join(os.tmpdir(), "piv-state-sqlite-"));
		tempDirs.push(cwd);
		const dbPath = path.join(cwd, ".piv-loop", "run-state.sqlite");
		const store = createRunStateStore({
			workspacePath: cwd,
			stateStore: { type: "sqlite", sqlitePath: dbPath },
		});

		await store.save(buildRunState("proj-a", "ENG-3"));
		await store.save(buildRunState("proj-a", "ENG-4"));
		await store.save(buildRunState("proj-b", "ENG-5"));

		const one = await store.load("proj-a", "ENG-3");
		expect(one?.issue.key).toBe("ENG-3");

		const listA = await store.list("proj-a");
		const keys = listA.map((state) => state.issue.key).sort();
		expect(keys).toEqual(["ENG-3", "ENG-4"]);
	});
});

import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertCommandOk, runCommand } from "adapters";
import { boardProjectsTable, projectBoardsTable } from "devos-db";
import { createServerTestApp } from "./app-test-helpers";
import {
	type DrizzleServerTestDatabase,
	createDrizzleServerTestDatabase,
} from "./server-db-test-helpers";

let testDatabase: DrizzleServerTestDatabase | undefined;
const tempDirs: string[] = [];

afterEach(async () => {
	if (testDatabase) {
		await testDatabase.cleanup();
		testDatabase = undefined;
	}
	await Promise.all(
		tempDirs
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("workspace environment route", () => {
	it("returns project folder and CodeGraph source status", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		const workspacePath = await tempDirectory();
		const folder = await tempDirectory();
		await mkdir(path.join(workspacePath, ".codegraph"), { recursive: true });
		await writeFile(path.join(workspacePath, ".codegraph", "codegraph.db"), "");
		await seedProject(folder);
		const app = createServerTestApp(testDatabase.db, {
			workspacePath,
		});

		const response = await app(
			new Request(
				"http://localhost/api/workspace/environment?projectId=project-1",
			),
		);
		const body = (await response.json()) as {
			folder: string;
			mcps: Array<{ id: string; available: boolean }>;
		};

		expect(response.status).toBe(200);
		expect(body.folder).toBe(folder);
		expect(body.mcps).toContainEqual(
			expect.objectContaining({
				id: "codegraph",
				available: true,
			}),
		);
	});

	it("reports git as unavailable for non-repository folders", async () => {
		const folder = await tempDirectory();
		const app = createServerTestApp(undefinedTestDb(), {
			workspacePath: folder,
		});

		const response = await app(
			new Request("http://localhost/api/workspace/environment"),
		);
		const body = (await response.json()) as {
			git: { available: boolean; reason: string };
		};

		expect(response.status).toBe(200);
		expect(body.git.available).toBe(false);
		expect(body.git.reason).toBe("Not a git repository");
	});

	it("returns branch, dirty state, and diff summary for git repositories", async () => {
		const folder = await tempDirectory();
		await git(folder, ["init", "-b", "main"]);
		await git(folder, ["config", "user.email", "test@example.com"]);
		await git(folder, ["config", "user.name", "Test User"]);
		await writeFile(path.join(folder, "tracked.txt"), "one\ntwo\n");
		await git(folder, ["add", "tracked.txt"]);
		await git(folder, ["commit", "-m", "initial"]);
		await writeFile(path.join(folder, "tracked.txt"), "one\nthree\nfour\n");
		await writeFile(path.join(folder, "untracked.txt"), "new\n");
		const app = createServerTestApp(undefinedTestDb(), {
			workspacePath: folder,
		});

		const response = await app(
			new Request("http://localhost/api/workspace/environment"),
		);
		const body = (await response.json()) as {
			git: {
				available: boolean;
				branch: string;
				dirty: boolean;
				added: number;
				deleted: number;
				untracked: number;
			};
		};

		expect(response.status).toBe(200);
		expect(body.git.available).toBe(true);
		expect(body.git.branch).toBe("main");
		expect(body.git.dirty).toBe(true);
		expect(body.git.added).toBeGreaterThan(0);
		expect(body.git.deleted).toBeGreaterThan(0);
		expect(body.git.untracked).toBe(1);
	});
});

async function tempDirectory(): Promise<string> {
	const directory = await mkdtemp(path.join(os.tmpdir(), "devos-env-"));
	tempDirs.push(directory);
	return directory;
}

async function seedProject(localFolder: string): Promise<void> {
	if (!testDatabase) throw new Error("Test database missing");
	await testDatabase.db.insert(projectBoardsTable).values({
		id: "board-1",
		name: "Board",
		description: "Test board",
		ownerId: "owner-1",
		createdAt: "2026-05-13T00:00:00.000Z",
		updatedAt: "2026-05-13T00:00:00.000Z",
	});
	await testDatabase.db.insert(boardProjectsTable).values({
		id: "project-1",
		boardId: "board-1",
		externalProjectId: null,
		name: "Project",
		description: null,
		repoOwner: null,
		repoName: null,
		baseBranch: "main",
		localFolder,
		lead: null,
		category: "local",
		priority: null,
		ownerId: "owner-1",
		createdAt: "2026-05-13T00:00:00.000Z",
		updatedAt: "2026-05-13T00:00:00.000Z",
	});
}

async function git(cwd: string, args: string[]): Promise<void> {
	const result = await runCommand("git", args, { cwd, timeoutMs: 5000 });
	assertCommandOk("git", args, result);
}

function undefinedTestDb(): never {
	return undefined as never;
}

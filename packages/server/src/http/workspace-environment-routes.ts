import { access } from "node:fs/promises";
import path from "node:path";
import { runCommand } from "adapters";
import { type ServerDatabase, boardProjectsTable, eq } from "devos-db";
import type { LocalWorkspaceIdentity } from "../local-workspace";
import { jsonSuccess } from "./response";
import type {
	WorkspaceEnvironmentGitStatus,
	WorkspaceEnvironmentResponse,
} from "./types/workspace-environment.types";

const ENDPOINT = "/api/workspace/environment";
const GIT_TIMEOUT_MS = 3000;

export async function handleWorkspaceEnvironmentRoute(
	request: Request,
	db: ServerDatabase["db"] | undefined,
	pathname: string,
	workspacePath: string,
	workspace: LocalWorkspaceIdentity,
): Promise<Response | undefined> {
	if (pathname !== ENDPOINT) return undefined;
	if (request.method !== "GET") {
		return new Response(null, { status: 405 });
	}
	const url = new URL(request.url);
	const projectId = url.searchParams.get("projectId")?.trim() || null;
	const folder = await resolveEnvironmentFolder(db, projectId, workspacePath);
	const response: WorkspaceEnvironmentResponse = {
		workspaceId: workspace.id,
		projectId,
		folder,
		git: await readGitStatus(folder),
		mcps: [await readCodeGraphSource(folder, workspacePath)],
	};
	return jsonSuccess(response);
}

async function resolveEnvironmentFolder(
	db: ServerDatabase["db"] | undefined,
	projectId: string | null,
	workspacePath: string,
): Promise<string> {
	if (!projectId || !db) return workspacePath;
	const [project] = await db
		.select({ localFolder: boardProjectsTable.localFolder })
		.from(boardProjectsTable)
		.where(eq(boardProjectsTable.id, projectId));
	return project?.localFolder?.trim() || workspacePath;
}

async function readGitStatus(
	folder: string,
): Promise<WorkspaceEnvironmentGitStatus> {
	const inside = await runGit(folder, ["rev-parse", "--is-inside-work-tree"]);
	if (inside.code !== 0 || inside.stdout.trim() !== "true") {
		return unavailableGit("Not a git repository");
	}
	const branch = await runGit(folder, ["branch", "--show-current"]);
	const status = await runGit(folder, ["status", "--short"]);
	const unstaged = await runGit(folder, ["diff", "--numstat"]);
	const staged = await runGit(folder, ["diff", "--cached", "--numstat"]);
	if (branch.code !== 0 || status.code !== 0) {
		return unavailableGit(
			branch.stderr || status.stderr || "Git status failed",
		);
	}
	const diff = [unstaged, staged].reduce(
		(total, result) => addDiffStats(total, result.stdout),
		{ added: 0, deleted: 0 },
	);
	const untracked = status.stdout
		.split(/\r?\n/)
		.filter((line) => line.startsWith("??")).length;
	return {
		available: true,
		branch: branch.stdout.trim() || "HEAD",
		dirty: status.stdout.trim().length > 0,
		added: diff.added,
		deleted: diff.deleted,
		untracked,
		reason: null,
	};
}

async function readCodeGraphSource(folder: string, workspacePath: string) {
	const databasePath = await firstExistingPath([
		path.join(folder, ".codegraph", "codegraph.db"),
		path.join(workspacePath, ".codegraph", "codegraph.db"),
	]);
	if (databasePath) {
		return {
			id: "codegraph",
			label: "CodeGraph",
			available: true,
			detail: path.relative(workspacePath, databasePath) || databasePath,
		};
	}
	return {
		id: "codegraph",
		label: "CodeGraph",
		available: false,
		detail: "Not initialized",
	};
}

async function firstExistingPath(paths: string[]): Promise<string | null> {
	for (const candidate of paths) {
		if (await pathExists(candidate)) {
			return candidate;
		}
	}
	return null;
}

async function pathExists(candidate: string): Promise<boolean> {
	try {
		await access(candidate);
		return true;
	} catch {
		return false;
	}
}

async function runGit(folder: string, args: string[]) {
	try {
		return await runCommand("git", args, {
			cwd: folder,
			timeoutMs: GIT_TIMEOUT_MS,
		});
	} catch (error) {
		return {
			code: 1,
			stdout: "",
			stderr: error instanceof Error ? error.message : String(error),
		};
	}
}

function unavailableGit(reason: string): WorkspaceEnvironmentGitStatus {
	return {
		available: false,
		branch: null,
		dirty: false,
		added: 0,
		deleted: 0,
		untracked: 0,
		reason,
	};
}

function addDiffStats(
	total: { added: number; deleted: number },
	raw: string,
): { added: number; deleted: number } {
	for (const line of raw.split(/\r?\n/)) {
		const [added, deleted] = line.split(/\s+/);
		total.added += parseDiffNumber(added);
		total.deleted += parseDiffNumber(deleted);
	}
	return total;
}

function parseDiffNumber(value: string | undefined): number {
	if (!value || value === "-") return 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

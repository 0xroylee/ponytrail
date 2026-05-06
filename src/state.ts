import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ResolvedProjectConfig, RunState, WorkflowStage } from "./types";

const LEGACY_STATE_DIR = path.join(".piv-loop", "runs");
const STATE_ROOT_DIR = path.join(".piv-loop", "projects");

export interface RunStateStore {
	load(projectId: string, issueKey: string): Promise<RunState | null>;
	save(state: RunState): Promise<void>;
	list(projectId: string): Promise<RunState[]>;
}

export function normalizeIssueKey(input: string): string {
	const match = input.trim().match(/[A-Z]+-\d+/);
	if (!match) {
		return input.trim().toUpperCase();
	}
	return match[0].toUpperCase();
}

export function stateFilePath(
	cwd: string,
	projectId: string,
	issueKey: string,
): string {
	return path.join(
		cwd,
		STATE_ROOT_DIR,
		projectId,
		"runs",
		`${normalizeIssueKey(issueKey)}.json`,
	);
}

function legacyStateFilePath(cwd: string, issueKey: string): string {
	return path.join(
		cwd,
		LEGACY_STATE_DIR,
		`${normalizeIssueKey(issueKey)}.json`,
	);
}

class JsonRunStateStore implements RunStateStore {
	constructor(private readonly cwd: string) {}

	async load(projectId: string, issueKey: string): Promise<RunState | null> {
		const file = stateFilePath(this.cwd, projectId, issueKey);
		try {
			const raw = await readFile(file, "utf8");
			return JSON.parse(raw) as RunState;
		} catch {
			if (projectId !== "default") {
				return null;
			}
			try {
				const raw = await readFile(
					legacyStateFilePath(this.cwd, issueKey),
					"utf8",
				);
				return JSON.parse(raw) as RunState;
			} catch {
				return null;
			}
		}
	}

	async save(state: RunState): Promise<void> {
		const file = stateFilePath(this.cwd, state.projectId, state.issue.key);
		await mkdir(path.dirname(file), { recursive: true });
		state.updatedAt = new Date().toISOString();
		await writeFile(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
	}

	async list(projectId: string): Promise<RunState[]> {
		const dir = path.join(this.cwd, STATE_ROOT_DIR, projectId, "runs");
		try {
			const files = await readdir(dir);
			const runs: RunState[] = [];
			for (const file of files) {
				if (!file.endsWith(".json")) {
					continue;
				}
				const raw = await readFile(path.join(dir, file), "utf8");
				runs.push(JSON.parse(raw) as RunState);
			}
			return runs;
		} catch {
			return [];
		}
	}
}

class SqliteRunStateStore implements RunStateStore {
	private readonly db: Database;

	constructor(dbFile: string) {
		mkdirSync(path.dirname(dbFile), { recursive: true });
		this.db = new Database(dbFile, { create: true });
		this.db.exec(
			`CREATE TABLE IF NOT EXISTS run_states (
				project_id TEXT NOT NULL,
				issue_key TEXT NOT NULL,
				state_json TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				PRIMARY KEY (project_id, issue_key)
			)`,
		);
		this.db.exec(
			"CREATE INDEX IF NOT EXISTS idx_run_states_project_updated ON run_states(project_id, updated_at)",
		);
	}

	async load(projectId: string, issueKey: string): Promise<RunState | null> {
		const key = normalizeIssueKey(issueKey);
		const row = this.db
			.query(
				"SELECT state_json FROM run_states WHERE project_id = ?1 AND issue_key = ?2",
			)
			.get(projectId, key) as { state_json: string } | null;
		if (!row?.state_json) {
			return null;
		}
		return JSON.parse(row.state_json) as RunState;
	}

	async save(state: RunState): Promise<void> {
		state.updatedAt = new Date().toISOString();
		const key = normalizeIssueKey(state.issue.key);
		this.db
			.query(
				`INSERT INTO run_states (project_id, issue_key, state_json, updated_at)
				 VALUES (?1, ?2, ?3, ?4)
				 ON CONFLICT(project_id, issue_key) DO UPDATE SET
				   state_json = excluded.state_json,
				   updated_at = excluded.updated_at`,
			)
			.run(state.projectId, key, JSON.stringify(state), state.updatedAt);
	}

	async list(projectId: string): Promise<RunState[]> {
		const rows = this.db
			.query(
				"SELECT state_json FROM run_states WHERE project_id = ?1 ORDER BY updated_at DESC",
			)
			.all(projectId) as Array<{ state_json: string }>;
		return rows.map((row) => JSON.parse(row.state_json) as RunState);
	}
}

export function createRunStateStore(
	config: Pick<ResolvedProjectConfig, "workspacePath" | "stateStore">,
): RunStateStore {
	if (config.stateStore.type === "sqlite") {
		const dbPath =
			config.stateStore.sqlitePath ??
			path.join(config.workspacePath, ".piv-loop", "run-state.sqlite");
		return new SqliteRunStateStore(dbPath);
	}
	return new JsonRunStateStore(config.workspacePath);
}

export async function loadRunState(
	cwd: string,
	projectId: string,
	issueKey: string,
): Promise<RunState | null> {
	return new JsonRunStateStore(cwd).load(projectId, issueKey);
}

export async function saveRunState(
	cwd: string,
	state: RunState,
): Promise<void> {
	await new JsonRunStateStore(cwd).save(state);
}

export async function listRunStates(
	cwd: string,
	projectId: string,
): Promise<RunState[]> {
	return new JsonRunStateStore(cwd).list(projectId);
}

export function transitionStage(
	state: RunState,
	next: WorkflowStage,
): RunState {
	return {
		...state,
		stage: next,
		updatedAt: new Date().toISOString(),
	};
}

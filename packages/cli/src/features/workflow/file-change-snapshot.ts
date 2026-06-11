import { runCommand } from "adapters";
import type { ResolvedProjectConfig, RunState, WorkflowStage } from "../types";
import { emitActionProgress } from "./progress";
import type { BuiltInWorkflowPhaseId } from "./types/workflow-metadata.types";

const GIT_TIMEOUT_MS = 3000;
const MAX_LISTED_FILES = 6;

const PHASE_LABELS = {
	implement: "Implement",
	plan: "Plan",
	testing: "Testing",
} satisfies Record<BuiltInWorkflowPhaseId, string>;

export async function emitPhaseFileChangesSnapshot({
	config,
	phaseId,
	stage,
	state,
}: {
	config: ResolvedProjectConfig;
	phaseId: BuiltInWorkflowPhaseId;
	stage: WorkflowStage;
	state: RunState;
}): Promise<void> {
	const detail = await createPhaseFileChangesSnapshot(config, state, phaseId);
	emitActionProgress(state, stage, "file-changes", "succeeded", { detail });
}

async function createPhaseFileChangesSnapshot(
	config: ResolvedProjectConfig,
	state: RunState,
	phaseId: BuiltInWorkflowPhaseId,
): Promise<string> {
	const label = PHASE_LABELS[phaseId];
	const folder = executionFolder(config, state);
	const inside = await runGit(folder, ["rev-parse", "--is-inside-work-tree"]);
	if (inside.code !== 0 || inside.stdout.trim() !== "true") {
		return `${label} file changes unavailable: Not a git repository.`;
	}
	const status = await runGit(folder, ["status", "--short"]);
	if (status.code !== 0) {
		return `${label} file changes unavailable: ${status.stderr || "Git status failed"}.`;
	}
	const lines = status.stdout
		.split(/\r?\n/)
		.map((line) => line.trimEnd())
		.filter(Boolean);
	if (lines.length === 0) {
		return `${label} file changes: No file changes detected.`;
	}
	const [unstaged, staged] = await Promise.all([
		runGit(folder, ["diff", "--numstat"]),
		runGit(folder, ["diff", "--cached", "--numstat"]),
	]);
	const diff = [unstaged, staged].reduce(
		(total, result) => addDiffStats(total, result.stdout),
		{ added: 0, deleted: 0 },
	);
	const files = lines.map(statusFilePath).filter(Boolean);
	const untracked = lines.filter((line) => line.startsWith("??")).length;
	return `${label} file changes: +${diff.added}/-${diff.deleted} lines in ${files.length} ${files.length === 1 ? "file" : "files"}${untrackedSuffix(untracked)}${fileListSuffix(files)}.`;
}

function executionFolder(
	config: ResolvedProjectConfig,
	state: RunState,
): string {
	return state.executionWorkspace?.mode === "git-worktree"
		? state.executionWorkspace.path
		: config.executionPath;
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

function statusFilePath(line: string): string {
	return line.slice(3).trim();
}

function untrackedSuffix(count: number): string {
	if (count <= 0) return "";
	return `, including ${count} untracked ${count === 1 ? "file" : "files"}`;
}

function fileListSuffix(files: string[]): string {
	if (files.length === 0) return "";
	const visible = files.slice(0, MAX_LISTED_FILES);
	const remaining = files.length - visible.length;
	return `: ${visible.join(", ")}${remaining > 0 ? `, and ${remaining} more` : ""}`;
}

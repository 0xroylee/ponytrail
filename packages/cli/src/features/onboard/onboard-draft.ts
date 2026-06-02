import path from "node:path";
import { clackPromptAdapter } from "../prompts";
import type { PromptAdapter } from "../prompts";
import {
	DEFAULT_LABEL_MAP,
	DEFAULT_REASONING_EFFORTS,
	DEFAULT_STATUS_MAP,
	DEFAULT_WORKSPACE_NAME,
} from "./constants";
import { collectInstanceDraft } from "./instance-prompts";
import type {
	OnboardDraft,
	OnboardDraftPromptDeps,
} from "./types/onboard.types";
import { resolveUserPath } from "./wizard-helpers";

const DEFAULT_CODEX_MODELS = {
	brainstorm: "gpt-5.5",
	plan: "gpt-5.5",
	implement: "gpt-5.3-codex",
	reviewTest: "gpt-5.3-codex",
} as const;

const ISOLATED_WORKTREES_DESCRIPTION =
	"Keeps each workflow task in its own git worktree so agent changes do not collide with your main checkout or other running tasks.";

export async function collectOnboardDraft(
	cwd: string,
	deps: Partial<OnboardDraftPromptDeps> = {},
): Promise<OnboardDraft> {
	const prompts = deps.prompts ?? clackPromptAdapter;
	const executionPath = resolveUserPath(cwd);
	const workspaceName = await promptText(
		prompts,
		"Workspace name",
		defaultWorkspaceName(executionPath),
	);
	const isolatedWorktrees = await prompts.confirm({
		message: "Use isolated worktrees?",
		description: ISOLATED_WORKTREES_DESCRIPTION,
		initialValue: true,
	});
	const instance = await collectInstanceDraft(prompts);

	return {
		workspaceName: workspaceName.trim() || DEFAULT_WORKSPACE_NAME,
		workspacePath: executionPath,
		executionPath,
		instance,
		notifications: disabledNotifications(),
		workflow: {
			isolatedWorktrees,
		},
		statusMap: { ...DEFAULT_STATUS_MAP },
		labelMap: DEFAULT_LABEL_MAP,
		codex: {
			reasoningEfforts: {
				brainstorm: DEFAULT_REASONING_EFFORTS.plan,
				plan: DEFAULT_REASONING_EFFORTS.plan,
				implement: DEFAULT_REASONING_EFFORTS.implement,
				reviewTest: DEFAULT_REASONING_EFFORTS.reviewTest,
				githubComment: DEFAULT_REASONING_EFFORTS.reviewTest,
			},
			models: {
				brainstorm: DEFAULT_CODEX_MODELS.brainstorm,
				plan: DEFAULT_CODEX_MODELS.plan,
				implement: DEFAULT_CODEX_MODELS.implement,
				reviewTest: DEFAULT_CODEX_MODELS.reviewTest,
				githubComment: DEFAULT_CODEX_MODELS.reviewTest,
			},
			plugins: ["github@openai-curated"],
			skillsets: ["devos"],
			configOverrides: { "features.codex_hooks": "true" },
			sandbox: "workspace-write",
		},
	};
}

function disabledNotifications(): OnboardDraft["notifications"] {
	return { email: { enabled: false, to: [] } };
}

function promptText(
	prompts: PromptAdapter,
	message: string,
	defaultValue: string,
): Promise<string> {
	return prompts.text({ message, defaultValue, initialValue: defaultValue });
}

function defaultWorkspaceName(executionPath: string): string {
	return path.basename(executionPath) || DEFAULT_WORKSPACE_NAME;
}

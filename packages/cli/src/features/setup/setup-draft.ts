import path from "node:path";
import { clackPromptAdapter } from "../prompts";
import type { PromptAdapter } from "../prompts";
import {
	DEFAULT_LABEL_MAP,
	DEFAULT_REASONING_EFFORTS,
	DEFAULT_STATUS_MAP,
	DEFAULT_WORKSPACE_NAME,
} from "./constants";
import type { SetupDraft, SetupDraftPromptDeps } from "./setup.types";
import { resolveUserPath } from "./wizard-helpers";

const DEFAULT_CODEX_MODELS = {
	plan: "gpt-5.5",
	implement: "gpt-5.3-codex",
	reviewTest: "gpt-5.3-codex",
} as const;

export async function collectSetupDraft(
	cwd: string,
	deps: Partial<SetupDraftPromptDeps> = {},
): Promise<SetupDraft> {
	const prompts = deps.prompts ?? clackPromptAdapter;
	const executionPath = resolveUserPath(cwd);
	const workspaceName = await promptText(
		prompts,
		"Workspace name",
		defaultWorkspaceName(executionPath),
	);

	return {
		workspaceName: workspaceName.trim() || DEFAULT_WORKSPACE_NAME,
		workspacePath: executionPath,
		executionPath,
		linearApiKey: process.env.LINEAR_API_KEY ?? "",
		notifications: {
			email: {
				enabled: false,
				to: [],
			},
		},
		statusMap: { ...DEFAULT_STATUS_MAP },
		labelMap: DEFAULT_LABEL_MAP,
		codex: {
			reasoningEfforts: {
				plan: DEFAULT_REASONING_EFFORTS.plan,
				implement: DEFAULT_REASONING_EFFORTS.implement,
				reviewTest: DEFAULT_REASONING_EFFORTS.reviewTest,
				githubComment: DEFAULT_REASONING_EFFORTS.reviewTest,
			},
			models: {
				plan: DEFAULT_CODEX_MODELS.plan,
				implement: DEFAULT_CODEX_MODELS.implement,
				reviewTest: DEFAULT_CODEX_MODELS.reviewTest,
				githubComment: DEFAULT_CODEX_MODELS.reviewTest,
			},
			plugins: ["github@openai-curated", "linear@openai-curated"],
			skillsets: ["devos"],
			configOverrides: { "features.codex_hooks": "true" },
			sandbox: "workspace-write",
		},
	};
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

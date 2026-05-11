import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { runCommand } from "../../utils/shell";
import { saveSqliteEnv } from "../config";
import type {
	GitHubDefaults,
	SetupCheckDeps,
	SetupDraft,
} from "../setup.types";
import type { CodexReasoningEffort } from "../types";
import {
	renderSetupGitHubInstallPrompt,
	renderSetupRtkInstallPrompt,
} from "./checks";
import { safeRun } from "./checks-helpers";
import {
	DEFAULT_BASE_BRANCH,
	DEFAULT_LABEL_MAP,
	DEFAULT_PROJECT_NAME,
	DEFAULT_REASONING_EFFORTS,
	DEFAULT_STATUS_MAP,
	ENV_FILE,
	LOCAL_CONFIG_FILE,
} from "./constants";
import { buildEnvUpdates, mergeEnvFile } from "./env-file";
import { renderLocalConfig } from "./local-config";
import { normalizeProjectId } from "./normalize";

export async function runSetupWizard(cwd: string): Promise<void> {
	const io = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		const rtk = await safeRun(runCommand, "rtk", ["--version"], cwd);
		if (rtk.code !== 0) process.stdout.write(renderSetupRtkInstallPrompt());
		const gh = await safeRun(runCommand, "gh", ["auth", "status"], cwd);
		if (gh.code !== 0) process.stdout.write(renderSetupGitHubInstallPrompt());

		const projectName = await ask(io, "Project name", DEFAULT_PROJECT_NAME);
		const projectId = await ask(
			io,
			"Project ID",
			normalizeProjectId(projectName),
		);
		const executionPath = resolveUserPath(
			await ask(io, "Local repository path", cwd),
		);
		const defaults = await inferGitHubDefaults(executionPath);
		const repoOwner = await ask(io, "GitHub owner", defaults.owner ?? "");
		const repoName = await ask(
			io,
			"GitHub repository name",
			defaults.name ?? "",
		);
		const baseBranch = await ask(
			io,
			"GitHub base branch",
			defaults.baseBranch ?? DEFAULT_BASE_BRANCH,
		);
		const linearApiKey = await ask(io, "Linear API key", "");
		const linearProjectId = emptyToUndefined(
			await ask(io, "Linear project ID filter (optional)", ""),
		);
		const linearTeamId = emptyToUndefined(
			await ask(io, "Linear team ID filter (optional)", ""),
		);
		const enableEmailNotifications = parseYesNo(
			await ask(io, "Enable email notifications? (y/N)", "N"),
		);
		const resendApiKey = enableEmailNotifications
			? emptyToUndefined(await ask(io, "Resend API key", ""))
			: undefined;
		const resendFrom = enableEmailNotifications
			? emptyToUndefined(await ask(io, "Resend sender email", ""))
			: undefined;
		const resendTo = enableEmailNotifications
			? parseRecipients(
					await ask(io, "Resend recipients (comma-separated)", ""),
				)
			: [];
		const statusMap = {
			backlog: await ask(io, "Status for backlog", DEFAULT_STATUS_MAP.backlog),
			assigned: await ask(
				io,
				"Status for assigned work",
				DEFAULT_STATUS_MAP.assigned,
			),
			planning: await ask(
				io,
				"Status while planning",
				DEFAULT_STATUS_MAP.planning,
			),
			implementing: await ask(
				io,
				"Status while implementing",
				DEFAULT_STATUS_MAP.implementing,
			),
			pr_created: await ask(
				io,
				"Status after PR is created",
				DEFAULT_STATUS_MAP.pr_created,
			),
			reviewing: await ask(
				io,
				"Status while reviewing",
				DEFAULT_STATUS_MAP.reviewing,
			),
			testing: await ask(
				io,
				"Status while testing",
				DEFAULT_STATUS_MAP.testing,
			),
			blocked: await ask(io, "Status when blocked", DEFAULT_STATUS_MAP.blocked),
			done: await ask(io, "Status when done", DEFAULT_STATUS_MAP.done),
		};
		const sandbox = normalizeSandbox(
			await ask(io, "Codex sandbox", "workspace-write"),
		);
		const planModel = await ask(io, "Planning model", "gpt-5.5");
		const implementModel = await ask(
			io,
			"Implementation model",
			"gpt-5.3-codex",
		);
		const reviewModel = await ask(io, "Review/testing model", "gpt-5.3-codex");
		const planReasoningEffort = normalizeReasoningEffort(
			await ask(
				io,
				"Planning reasoning effort",
				DEFAULT_REASONING_EFFORTS.plan,
			),
			DEFAULT_REASONING_EFFORTS.plan,
		);
		const implementReasoningEffort = normalizeReasoningEffort(
			await ask(
				io,
				"Implementation reasoning effort",
				DEFAULT_REASONING_EFFORTS.implement,
			),
			DEFAULT_REASONING_EFFORTS.implement,
		);
		const reviewReasoningEffort = normalizeReasoningEffort(
			await ask(
				io,
				"Review/testing reasoning effort",
				DEFAULT_REASONING_EFFORTS.reviewTest,
			),
			DEFAULT_REASONING_EFFORTS.reviewTest,
		);
		const enablePlugins = parseYesNo(
			await ask(io, "Enable GitHub and Linear Codex plugins? (Y/n)", "Y"),
		);

		const draft: SetupDraft = {
			projectId: normalizeProjectId(projectId),
			projectName: projectName.trim() || DEFAULT_PROJECT_NAME,
			workspacePath: executionPath,
			executionPath,
			repoOwner,
			repoName,
			baseBranch,
			linearApiKey,
			linearProjectId,
			linearTeamId,
			notifications: {
				email: {
					enabled: enableEmailNotifications,
					resendApiKey,
					from: resendFrom,
					to: resendTo,
				},
			},
			statusMap,
			labelMap: DEFAULT_LABEL_MAP,
			codex: {
				reasoningEfforts: {
					plan: planReasoningEffort,
					implement: implementReasoningEffort,
					reviewTest: reviewReasoningEffort,
				},
				models: {
					plan: planModel,
					implement: implementModel,
					reviewTest: reviewModel,
				},
				plugins: enablePlugins
					? ["github@openai-curated", "linear@openai-curated"]
					: [],
				skillsets: ["adhd-ai"],
				configOverrides: { "features.codex_hooks": "true" },
				sandbox,
			},
		};

		await writeSetupFiles(cwd, draft);
		process.stdout.write(
			`Setup files written: ${ENV_FILE}, ${LOCAL_CONFIG_FILE}; secrets saved to .piv-loop/config/env.sqlite\nRun 'adhd-ai setup --check' to validate this machine.\n`,
		);
	} finally {
		io.close();
	}
}

export async function writeSetupFiles(
	cwd: string,
	draft: SetupDraft,
): Promise<void> {
	const envPath = path.join(cwd, ENV_FILE);
	const configPath = path.join(cwd, LOCAL_CONFIG_FILE);
	const existingEnv = await readExistingFile(envPath);
	await writeFile(envPath, mergeEnvFile(existingEnv, buildEnvUpdates(draft)));
	await saveSqliteEnv(cwd, {
		LINEAR_API_KEY: draft.linearApiKey,
		RESEND_API_KEY: draft.notifications.email.resendApiKey,
	});
	await writeFile(configPath, renderLocalConfig(draft));
}

async function ask(
	io: readline.Interface,
	label: string,
	defaultValue: string,
): Promise<string> {
	const suffix = defaultValue ? ` [${defaultValue}]` : "";
	const answer = await io.question(`${label}${suffix}: `);
	return answer.trim() || defaultValue;
}

async function readExistingFile(filePath: string): Promise<string | undefined> {
	try {
		return await readFile(filePath, "utf8");
	} catch {
		return undefined;
	}
}

async function inferGitHubDefaults(cwd: string): Promise<GitHubDefaults> {
	const remote = await safeRun(
		runCommand as NonNullable<SetupCheckDeps["runCommand"]>,
		"git",
		["config", "--get", "remote.origin.url"],
		cwd,
	);
	const branch = await safeRun(
		runCommand as NonNullable<SetupCheckDeps["runCommand"]>,
		"git",
		["symbolic-ref", "refs/remotes/origin/HEAD", "--short"],
		cwd,
	);
	const parsed = parseGitHubRemote(remote.stdout.trim());
	const branchName = branch.stdout.trim().replace(/^origin\//, "");
	return { ...parsed, baseBranch: branchName || DEFAULT_BASE_BRANCH };
}

function parseGitHubRemote(
	remote: string,
): Pick<GitHubDefaults, "owner" | "name"> {
	const httpsMatch =
		/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/.exec(remote);
	if (httpsMatch) return { owner: httpsMatch[1], name: httpsMatch[2] };
	const sshMatch = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/.exec(remote);
	if (sshMatch) return { owner: sshMatch[1], name: sshMatch[2] };
	return {};
}

function resolveUserPath(input: string): string {
	if (input === "~") return os.homedir();
	if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
	return path.resolve(input);
}

function emptyToUndefined(input: string): string | undefined {
	const value = input.trim();
	return value ? value : undefined;
}

function parseRecipients(input: string): string[] {
	return input
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function normalizeSandbox(
	input: string,
): SetupDraft["codex"]["sandbox"] | undefined {
	const value = input.trim();
	if (!value || value === "off" || value === "none" || value === "0")
		return undefined;
	if (
		value === "read-only" ||
		value === "workspace-write" ||
		value === "danger-full-access"
	) {
		return value;
	}
	return "workspace-write";
}

function normalizeReasoningEffort(
	input: string,
	fallback: CodexReasoningEffort,
): CodexReasoningEffort {
	const value = input.trim().toLowerCase();
	if (
		value === "low" ||
		value === "medium" ||
		value === "high" ||
		value === "xhigh"
	) {
		return value;
	}
	return fallback;
}

function parseYesNo(input: string): boolean {
	const value = input.trim().toLowerCase();
	return value === "" || value === "y" || value === "yes" || value === "true";
}

import { access, readFile } from "node:fs/promises";
import { findClaudeBinary } from "../../utils/claude-path";
import { runCommand } from "../../utils/shell";
import { loadConfig } from "../config";
import type { LoadedConfig } from "../config";
import type { SetupCheck, SetupCheckDeps } from "../setup.types";
import {
	checkTrackedConfigSecrets,
	commandFailureMessage,
	formatMissingRtkMessage,
	safeRun,
} from "./checks-helpers";
import { GITHUB_CLI_INSTALL_URL, RTK_INSTALL_URL } from "./constants";

export function formatSetupChecks(checks: SetupCheck[]): string {
	const lines = checks.map((check) => {
		const marker = check.status === "pass" ? "PASS" : "FAIL";
		return `${marker}: ${check.name} - ${check.message}`;
	});
	return `${lines.join("\n")}\n`;
}

export async function collectSetupChecks(
	cwd: string,
	deps: SetupCheckDeps = {},
): Promise<SetupCheck[]> {
	const configLoader = deps.loadConfig ?? loadConfig;
	const commandRunner = deps.runCommand ?? runCommand;
	const accessPath = deps.access ?? access;
	const readText = deps.readFile ?? readFile;
	const checks: SetupCheck[] = [];

	let config: LoadedConfig;
	try {
		config = await configLoader(cwd);
		checks.push({
			name: "Config",
			status: "pass",
			message: "configuration loaded successfully",
		});
	} catch (error) {
		checks.push({
			name: "Config",
			status: "fail",
			message: error instanceof Error ? error.message : String(error),
		});
		return checks;
	}

	const missingApiKeyProjects = config.projects
		.filter((project) => !project.linear.apiKey)
		.map((project) => project.id);
	checks.push(
		missingApiKeyProjects.length === 0
			? {
					name: "Linear API key",
					status: "pass",
					message: "configured for every project",
				}
			: {
					name: "Linear API key",
					status: "fail",
					message: `missing for projects: ${missingApiKeyProjects.join(", ")}`,
				},
	);

	for (const project of config.projects) {
		try {
			await accessPath(project.executionPath);
			checks.push({
				name: `Execution path (${project.id})`,
				status: "pass",
				message: project.executionPath,
			});
		} catch {
			checks.push({
				name: `Execution path (${project.id})`,
				status: "fail",
				message: `${project.executionPath} does not exist or is not accessible`,
			});
		}
	}
	for (const project of config.projects) {
		const skillChecks: Array<[string, string]> = [
			["plan", project.skills.plan],
			["implement", project.skills.implement],
			["reviewTest", project.skills.reviewTest],
		];
		for (const [stage, skillPath] of skillChecks) {
			try {
				await accessPath(skillPath);
				checks.push({
					name: `Skill file (${project.id}:${stage})`,
					status: "pass",
					message: skillPath,
				});
			} catch {
				checks.push({
					name: `Skill file (${project.id}:${stage})`,
					status: "fail",
					message: `${skillPath} does not exist or is not accessible`,
				});
			}
		}
	}
	for (const project of config.projects) {
		const autoSelect = project.skills.autoSelect;
		if (!autoSelect?.enabled) continue;

		if (autoSelect.sources.folder) {
			try {
				await accessPath(project.skills.root);
				checks.push({
					name: `Skill auto-select folder (${project.id})`,
					status: "pass",
					message: project.skills.root,
				});
			} catch {
				checks.push({
					name: `Skill auto-select folder (${project.id})`,
					status: "fail",
					message: `${project.skills.root} does not exist or is not accessible`,
				});
			}
		}
		if (autoSelect.sources.database) {
			const databasePath = autoSelect.databasePath?.trim();
			if (!databasePath) {
				checks.push({
					name: `Skill auto-select database (${project.id})`,
					status: "fail",
					message:
						"skills.autoSelect.databasePath is required when database source is enabled",
				});
				continue;
			}
			try {
				await accessPath(databasePath);
				checks.push({
					name: `Skill auto-select database (${project.id})`,
					status: "pass",
					message: databasePath,
				});
			} catch {
				checks.push({
					name: `Skill auto-select database (${project.id})`,
					status: "fail",
					message: `${databasePath} does not exist or is not accessible`,
				});
			}
		}
	}

	const commandCwd = config.projects[0]?.executionPath ?? cwd;
	const gh = await safeRun(commandRunner, "gh", ["auth", "status"], commandCwd);
	checks.push(
		gh.code === 0
			? { name: "GitHub auth", status: "pass", message: "gh is authenticated" }
			: {
					name: "GitHub auth",
					status: "fail",
					message: commandFailureMessage(gh),
				},
	);

	const rtk = await safeRun(commandRunner, "rtk", ["--version"], commandCwd);
	checks.push(
		rtk.code === 0
			? { name: "RTK binary", status: "pass", message: "rtk is available" }
			: {
					name: "RTK binary",
					status: "fail",
					message: formatMissingRtkMessage(),
				},
	);

	const codexBackends = config.projects.filter(
		(project) => !project.agent?.backend || project.agent.backend === "codex",
	);
	if (codexBackends.length > 0) {
		const codexBinary = config.projects[0]?.codex.binary ?? "codex";
		const codex = await safeRun(
			commandRunner,
			codexBinary,
			["--version"],
			commandCwd,
		);
		checks.push(
			codex.code === 0
				? {
						name: "Codex binary",
						status: "pass",
						message: `${codexBinary} is available`,
					}
				: {
						name: "Codex binary",
						status: "fail",
						message: commandFailureMessage(codex),
					},
		);
	}

	const claudeCodeBackends = config.projects.filter(
		(project) => project.agent?.backend === "claude-code",
	);
	if (claudeCodeBackends.length > 0) {
		const claudePath = findClaudeBinary();
		if (claudePath) {
			const claude = await safeRun(
				commandRunner,
				claudePath,
				["--version"],
				commandCwd,
			);
			checks.push(
				claude.code === 0
					? {
							name: "Claude Code binary",
							status: "pass",
							message: `${claudePath} is available`,
						}
					: {
							name: "Claude Code binary",
							status: "fail",
							message: commandFailureMessage(claude),
						},
			);
		} else {
			checks.push({
				name: "Claude Code binary",
				status: "fail",
				message:
					"claude binary not found. Install with: npm install -g @anthropic-ai/claude-code",
			});
		}
	}

	checks.push(await checkTrackedConfigSecrets(cwd, config, readText));
	return checks;
}

export async function runSetupCheck(cwd: string): Promise<void> {
	const checks = await collectSetupChecks(cwd);
	process.stdout.write(formatSetupChecks(checks));
	if (checks.some((check) => check.status === "fail")) {
		throw new Error("Setup check failed");
	}
}

export function renderSetupRtkInstallPrompt(): string {
	return `RTK is required for ADHD.ai agent workflow commands.\nInstall RTK before running workflows: ${RTK_INSTALL_URL}\n`;
}

export function renderSetupGitHubInstallPrompt(): string {
	return `GitHub CLI auth is required for ADHD.ai GitHub workflow commands.\nInstall GitHub CLI: ${GITHUB_CLI_INSTALL_URL}\nThen authenticate: gh auth login\n`;
}

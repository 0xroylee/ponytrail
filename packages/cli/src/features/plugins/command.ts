import type { CommandResult } from "../../utils/shell";
import { runCommand } from "../../utils/shell";
import { type LoadedConfig, loadSqliteEnv, saveSqliteEnv } from "../config";
import { getPluginTemplate, listPluginTemplates } from "./catalog";
import type { PluginTemplate, PluginsCommand } from "./plugin-template.types";

const ENABLED_PLUGINS_ENV = "DEVOS_ENABLED_PLUGINS";
const CODEX_PLUGINS_ENV = "CODEX_PLUGINS";

export interface PluginsCommandDeps {
	runCommand?: (
		command: string,
		args: string[],
		options: { cwd: string },
	) => Promise<CommandResult>;
	loadEnv?: (cwd: string) => Promise<Record<string, string> | undefined>;
	saveEnv?: (
		cwd: string,
		updates: Record<string, string | undefined>,
	) => Promise<void>;
}

export async function handlePluginsCommand(
	_config: LoadedConfig,
	command: PluginsCommand,
	cwd: string,
	deps: PluginsCommandDeps = {},
): Promise<void> {
	const loadEnv = deps.loadEnv ?? loadSqliteEnv;
	const saveEnv = deps.saveEnv ?? saveSqliteEnv;
	const env = (await loadEnv(cwd)) ?? {};
	const enabled = parseList(env[ENABLED_PLUGINS_ENV]);

	if (command.action === "list") {
		await listPlugins(enabled, command.enabledOnly === true);
		return;
	}

	const template = await getPluginTemplate(command.pluginId);
	if (command.action === "show") {
		process.stdout.write(`${JSON.stringify(template, null, "\t")}\n`);
		return;
	}
	if (command.action === "install") {
		writeInstallInstructions(template);
		return;
	}
	if (command.action === "enable") {
		await enablePlugin(template, enabled, env, cwd, saveEnv);
		return;
	}

	await checkPlugin(template, cwd, deps.runCommand ?? runCommand);
}

async function listPlugins(
	enabled: string[],
	enabledOnly: boolean,
): Promise<void> {
	const templates = await listPluginTemplates();
	for (const template of templates) {
		const isEnabled =
			enabled.includes(template.id) ||
			(template.enabledByDefault && !enabledOnly);
		if (enabledOnly && !enabled.includes(template.id)) continue;
		process.stdout.write(
			`${template.id}\t${template.title}\t${isEnabled ? "enabled" : "disabled"}\n`,
		);
	}
}

function writeInstallInstructions(template: PluginTemplate): void {
	process.stdout.write(`${template.title}\n`);
	process.stdout.write(`${template.description}\n`);
	if (template.source.githubRepo) {
		process.stdout.write(`Source: ${template.source.githubRepo}\n`);
	} else if (template.source.script) {
		process.stdout.write(`Source: ${template.source.script}\n`);
	}
	for (const note of template.install.notes) {
		process.stdout.write(`- ${note}\n`);
	}
	if (template.install.commands.length > 0) {
		process.stdout.write("Suggested commands:\n");
		for (const command of template.install.commands) {
			process.stdout.write(
				`- ${[command.command, ...command.args].join(" ")}\n`,
			);
		}
	}
}

async function enablePlugin(
	template: PluginTemplate,
	enabled: string[],
	env: Record<string, string>,
	cwd: string,
	saveEnv: NonNullable<PluginsCommandDeps["saveEnv"]>,
): Promise<void> {
	const nextEnabled = uniqueSorted([...enabled, template.id]);
	const codexPlugins = template.enable.config.codex?.plugins ?? [];
	const nextCodexPlugins = uniqueSorted([
		...parseList(env[CODEX_PLUGINS_ENV]),
		...codexPlugins,
	]);
	await saveEnv(cwd, {
		[ENABLED_PLUGINS_ENV]: nextEnabled.join(","),
		[CODEX_PLUGINS_ENV]:
			nextCodexPlugins.length > 0 ? nextCodexPlugins.join(",") : undefined,
	});
	process.stdout.write(`Enabled plugin ${template.id}\n`);
}

async function checkPlugin(
	template: PluginTemplate,
	cwd: string,
	commandRunner: NonNullable<PluginsCommandDeps["runCommand"]>,
): Promise<void> {
	let failed = false;
	for (const check of template.checks) {
		const result = await commandRunner(check.command, check.args, { cwd });
		if (result.code === 0) {
			process.stdout.write(`PASS\t${check.title}\t${check.expected}\n`);
			continue;
		}
		failed = true;
		const output = `${result.stdout}${result.stderr}`.trim();
		process.stdout.write(`FAIL\t${check.title}\t${output}\n`);
	}
	if (failed) throw new Error(`Plugin ${template.id} check failed`);
}

function parseList(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

function uniqueSorted(values: string[]): string[] {
	return Array.from(new Set(values)).sort();
}

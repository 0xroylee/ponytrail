import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type {
	PluginCheckTemplate,
	PluginCommandTemplate,
	PluginTemplate,
} from "./types/plugin-template.types";

export async function listPluginTemplates(): Promise<PluginTemplate[]> {
	const dir = await resolveTemplatesDir();
	const files = (await readdir(dir))
		.filter(
			(file) => file.endsWith(".json") && !file.endsWith(".template.json"),
		)
		.sort();
	const templates = await Promise.all(
		files.map((file) => loadPluginTemplateFromPath(path.join(dir, file))),
	);
	return templates.sort((a, b) => a.id.localeCompare(b.id));
}

export async function getPluginTemplate(
	pluginId: string,
): Promise<PluginTemplate> {
	const templates = await listPluginTemplates();
	const template = templates.find((candidate) => candidate.id === pluginId);
	if (!template) {
		throw new Error(`Plugin '${pluginId}' not found`);
	}
	return template;
}

async function loadPluginTemplateFromPath(
	filePath: string,
): Promise<PluginTemplate> {
	const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
	return parsePluginTemplate(parsed, filePath);
}

export function parsePluginTemplate(
	input: unknown,
	sourceLabel = "plugin template",
): PluginTemplate {
	const record = requireRecord(input, sourceLabel);
	const template: PluginTemplate = {
		schemaVersion: requireOne(
			record.schemaVersion,
			`${sourceLabel}.schemaVersion`,
		),
		id: requireString(record.id, `${sourceLabel}.id`),
		enabledByDefault: requireBoolean(
			record.enabledByDefault,
			`${sourceLabel}.enabledByDefault`,
		),
		title: requireString(record.title, `${sourceLabel}.title`),
		description: requireString(
			record.description,
			`${sourceLabel}.description`,
		),
		functional: requireStringArray(
			record.functional,
			`${sourceLabel}.functional`,
		),
		source: parseSource(record.source, `${sourceLabel}.source`),
		install: parseInstall(record.install, `${sourceLabel}.install`),
		enable: parseEnable(record.enable, `${sourceLabel}.enable`),
		checks: requireArray(record.checks, `${sourceLabel}.checks`).map(
			(check, index) => parseCheck(check, `${sourceLabel}.checks[${index}]`),
		),
		tokenOptimization: parseTokenOptimization(
			record.tokenOptimization,
			`${sourceLabel}.tokenOptimization`,
		),
		maintainers: requireStringArray(
			record.maintainers,
			`${sourceLabel}.maintainers`,
		),
	};
	if (!/^[a-z0-9][a-z0-9-]*$/.test(template.id)) {
		throw new Error(`${sourceLabel}.id must be kebab-case`);
	}
	return template;
}

async function resolveTemplatesDir(): Promise<string> {
	const candidates = [
		path.resolve(import.meta.dir, "../../../templates/plugins"),
		path.resolve(import.meta.dir, "../templates/plugins"),
	];
	for (const candidate of candidates) {
		try {
			await readdir(candidate);
			return candidate;
		} catch {
			// Try the next source/dist layout.
		}
	}
	throw new Error("Plugin templates directory not found");
}

function parseSource(input: unknown, label: string): PluginTemplate["source"] {
	const record = requireRecord(input, label);
	const type = requireString(record.type, `${label}.type`);
	if (type !== "github" && type !== "script") {
		throw new Error(`${label}.type must be github or script`);
	}
	return {
		type,
		githubRepo: optionalString(record.githubRepo, `${label}.githubRepo`),
		script: optionalString(record.script, `${label}.script`),
	};
}

function parseInstall(
	input: unknown,
	label: string,
): PluginTemplate["install"] {
	const record = requireRecord(input, label);
	return {
		kind: requireString(record.kind, `${label}.kind`),
		commands: requireArray(record.commands, `${label}.commands`).map(
			(command, index) => parseCommand(command, `${label}.commands[${index}]`),
		),
		notes: requireStringArray(record.notes, `${label}.notes`),
	};
}

function parseEnable(input: unknown, label: string): PluginTemplate["enable"] {
	const record = requireRecord(input, label);
	const config = requireRecord(record.config, `${label}.config`);
	const codex =
		config.codex === undefined
			? undefined
			: requireRecord(config.codex, `${label}.config.codex`);
	return {
		kind: requireString(record.kind, `${label}.kind`),
		config: {
			codex: codex
				? {
						plugins:
							codex.plugins === undefined
								? undefined
								: requireStringArray(
										codex.plugins,
										`${label}.config.codex.plugins`,
									),
					}
				: undefined,
		},
		notes: requireStringArray(record.notes, `${label}.notes`),
	};
}

function parseCheck(input: unknown, label: string): PluginCheckTemplate {
	const record = requireRecord(input, label);
	return {
		title: requireString(record.title, `${label}.title`),
		...parseCommand(record, label),
		expected: requireString(record.expected, `${label}.expected`),
	};
}

function parseCommand(input: unknown, label: string): PluginCommandTemplate {
	const record = requireRecord(input, label);
	return {
		command: requireString(record.command, `${label}.command`),
		args: requireStringArray(record.args, `${label}.args`),
	};
}

function parseTokenOptimization(
	input: unknown,
	label: string,
): PluginTemplate["tokenOptimization"] {
	const record = requireRecord(input, label);
	return {
		strategy: requireString(record.strategy, `${label}.strategy`),
		savingsSignal: requireString(
			record.savingsSignal,
			`${label}.savingsSignal`,
		),
		whenToUse: requireStringArray(record.whenToUse, `${label}.whenToUse`),
	};
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`${label} must be an object`);
	}
	return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): unknown[] {
	if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
	return value;
}

function requireString(value: unknown, label: string): string {
	if (typeof value !== "string" || value.trim() === "") {
		throw new Error(`${label} must be a non-empty string`);
	}
	return value;
}

function optionalString(value: unknown, label: string): string | undefined {
	if (value === undefined || value === "") return undefined;
	return requireString(value, label);
}

function requireStringArray(value: unknown, label: string): string[] {
	return requireArray(value, label).map((item, index) =>
		requireString(item, `${label}[${index}]`),
	);
}

function requireBoolean(value: unknown, label: string): boolean {
	if (typeof value !== "boolean") throw new Error(`${label} must be a boolean`);
	return value;
}

function requireOne(value: unknown, label: string): 1 {
	if (value !== 1) throw new Error(`${label} must be 1`);
	return 1;
}

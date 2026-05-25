import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import type {
	CreateDevosWorkflowPromptAdapter,
	GeneratedWorkflowMeta,
	WorkflowCommandSpec,
	WorkflowPhraseSpec,
} from "./types/workflow.types";

export function createNodePromptAdapter(): CreateDevosWorkflowPromptAdapter {
	const rl = createInterface({ input, output });
	return {
		text: async ({ message, defaultValue }) => {
			const suffix = defaultValue ? ` (${defaultValue})` : "";
			const answer = await rl.question(`${message}${suffix}: `);
			return answer.trim() || defaultValue || "";
		},
		confirm: async ({ message, defaultValue }) => {
			const suffix = defaultValue ? "Y/n" : "y/N";
			const answer = (await rl.question(`${message} (${suffix}): `))
				.trim()
				.toLowerCase();
			if (!answer) return defaultValue === true;
			return answer === "y" || answer === "yes";
		},
		close: () => rl.close(),
	};
}

export async function promptWorkflowMeta(
	prompts: CreateDevosWorkflowPromptAdapter,
): Promise<GeneratedWorkflowMeta> {
	const title = await promptRequired(prompts, "Workflow title");
	const description = await promptRequired(prompts, "Workflow description");
	const precheck = await promptCommand(prompts, "Precheck", {
		command: "bun",
		args: ["--version"],
	});
	const check = await promptCommand(prompts, "Final check", {
		command: "bun",
		args: ["test"],
	});
	const phrases = await promptPhrases(prompts);
	return {
		title,
		description,
		phrases,
		agents: uniqueSorted(phrases.map((phrase) => phrase.agent)),
		skills: uniqueSorted(phrases.map((phrase) => phrase.skill)),
		precheck,
		check,
	};
}

export async function promptRequired(
	prompts: CreateDevosWorkflowPromptAdapter,
	message: string,
	defaultValue?: string,
): Promise<string> {
	while (true) {
		const value = (await prompts.text({ message, defaultValue })).trim();
		if (value) return value;
		process.stderr.write(`${message} is required\n`);
	}
}

export function parseJsonStringArray(
	inputValue: string,
	label: string,
): string[] {
	const parsed = JSON.parse(inputValue) as unknown;
	if (!Array.isArray(parsed)) {
		throw new Error(`${label} must be a JSON array`);
	}
	return parsed.map((item, index) => {
		if (typeof item !== "string") {
			throw new Error(`${label}[${index}] must be a string`);
		}
		return item;
	});
}

async function promptCommand(
	prompts: CreateDevosWorkflowPromptAdapter,
	label: string,
	defaults: WorkflowCommandSpec,
): Promise<WorkflowCommandSpec> {
	const command = await promptRequired(
		prompts,
		`${label} command`,
		defaults.command,
	);
	const args = await promptArgs(prompts, `${label} args JSON`, defaults.args);
	return { command, args };
}

async function promptArgs(
	prompts: CreateDevosWorkflowPromptAdapter,
	message: string,
	defaultValue: string[],
): Promise<string[]> {
	while (true) {
		const value = await prompts.text({
			message,
			defaultValue: JSON.stringify(defaultValue),
		});
		try {
			return parseJsonStringArray(value, message);
		} catch (error) {
			process.stderr.write(
				`${error instanceof Error ? error.message : String(error)}\n`,
			);
		}
	}
}

async function promptPhrases(
	prompts: CreateDevosWorkflowPromptAdapter,
): Promise<WorkflowPhraseSpec[]> {
	const phrases: WorkflowPhraseSpec[] = [];
	while (true) {
		phrases.push({
			text: await promptRequired(prompts, "Phrase text"),
			agent: await promptRequired(prompts, "Phrase agent"),
			skill: await promptRequired(prompts, "Phrase skill"),
		});
		const addAnother = await prompts.confirm({
			message: "Add another phrase",
			defaultValue: false,
		});
		if (!addAnother) return phrases;
	}
}

function uniqueSorted(values: string[]): string[] {
	return Array.from(new Set(values)).sort();
}

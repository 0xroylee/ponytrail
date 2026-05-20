import type { Command } from "commander";
import type {
	CliCommand,
	ProjectCommanderOptions,
	SkillAddCommanderOptions,
	SkillUpdateCommanderOptions,
} from "../../args.types";

export function registerSkillsCommand(
	program: Command,
	setCommand: (command: CliCommand) => void,
): void {
	const skills = program.command("skills").description("manage project skills");
	skills
		.command("list")
		.option("--project <PROJECT_ID>")
		.action((options: ProjectCommanderOptions) => {
			setCommand({
				kind: "skills",
				command: { action: "list", projectId: options.project },
			});
		});
	skills
		.command("add")
		.requiredOption("--title <TITLE>")
		.requiredOption("--description <TEXT>")
		.requiredOption("--content <TEXT>")
		.option("--project <PROJECT_ID>")
		.action((options: SkillAddCommanderOptions) => {
			setCommand({
				kind: "skills",
				command: {
					action: "add",
					title: options.title,
					description: options.description,
					content: options.content,
					projectId: options.project,
				},
			});
		});
	skills
		.command("update <NAME>")
		.option("--title <TITLE>")
		.option("--description <TEXT>")
		.option("--content <TEXT>")
		.option("--project <PROJECT_ID>")
		.action(
			(
				name: string,
				options: SkillUpdateCommanderOptions,
				command: Command,
			) => {
				if (
					options.title === undefined &&
					options.description === undefined &&
					options.content === undefined
				) {
					command.error(
						"skills update requires at least one of --title, --description, or --content",
					);
				}
				setCommand({
					kind: "skills",
					command: {
						action: "update",
						name,
						title: options.title,
						description: options.description,
						content: options.content,
						projectId: options.project,
					},
				});
			},
		);
	skills
		.command("remove <NAME>")
		.option("--project <PROJECT_ID>")
		.action((name: string, options: ProjectCommanderOptions) => {
			setCommand({
				kind: "skills",
				command: { action: "remove", name, projectId: options.project },
			});
		});
}

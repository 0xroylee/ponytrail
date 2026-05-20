import { Command } from "commander";
import { parsePositiveInt } from "./args-utils";
import type {
	CliCommand,
	CliParseOutput,
	DaemonCommanderOptions,
	OnboardCommanderOptions,
	RunCommanderOptions,
	StatusCommanderOptions,
} from "./args.types";
import { registerSkillsCommand } from "./features/skills/args";
import { registerTaskCommand } from "./features/task-intake/args";

export type { CliCommand, SkillsCommand, TaskCommand } from "./args.types";

export function parseArgs(
	argv: string[],
	output: CliParseOutput = {},
): CliCommand {
	let parsedCommand: CliCommand | undefined;
	const program = createCliProgram((command) => {
		parsedCommand = command;
	}, output);

	if (argv.slice(2).length === 0) {
		program.help();
	}

	program.parse(argv, { from: "node" });
	const command = parsedCommand;
	if (!command) {
		program.help();
		throw new Error("Commander help did not exit");
	}
	return command;
}

function createCliProgram(
	setCommand: (command: CliCommand) => void,
	output: CliParseOutput,
): Command {
	const program = new Command("devos")
		.description(
			"devos.ing ADHD (Agentic Development Hub & Daemon) CLI orchestration workflow",
		)
		.exitOverride()
		.showHelpAfterError()
		.showSuggestionAfterError();
	program.configureOutput(output);
	program.helpCommand("help [command]", "display help for command");

	registerRunCommand(program, setCommand);
	registerDaemonCommand(program, setCommand);
	registerOnboardCommand(program, setCommand);
	registerStatusCommand(program, setCommand);
	program
		.command("projects")
		.description("list configured projects")
		.action(() => {
			setCommand({ kind: "projects" });
		});
	registerTaskCommand(program, setCommand);
	registerSkillsCommand(program, setCommand);

	return program;
}

function registerRunCommand(
	program: Command,
	setCommand: (command: CliCommand) => void,
): void {
	program
		.command("run")
		.description("run workflow orchestration")
		.option("--project <PROJECT_ID>", "select one configured project")
		.option("--all-projects", "run across all configured projects")
		.option("--issue <LINEAR_KEY_OR_URL>", "scope run to a Linear issue")
		.option("--poll", "continue polling for new work")
		.option("--poll-forever", "poll continuously")
		.option("--no-exit-when-idle", "disable automatic exit while idle")
		.option("--concurrency <N>", "worker concurrency", parsePositiveInt)
		.option("--poll-interval-ms <MS>", "poll interval", parsePositiveInt)
		.option("--max-poll-cycles <N>", "max polling cycles", parsePositiveInt)
		.option("--isolated-worktrees", "enable isolated worktree mode")
		.action((options: RunCommanderOptions, command: Command) => {
			if (options.project && options.allProjects) {
				command.error("run command cannot use --project with --all-projects");
			}
			if (options.pollForever && options.maxPollCycles !== undefined) {
				command.error(
					"run command cannot use --poll-forever with --max-poll-cycles",
				);
			}
			const isolatedWorktrees = options.isolatedWorktrees ? true : undefined;
			setCommand({
				kind: "run",
				options: {
					issueArg: options.issue,
					projectId: options.project,
					allProjects: options.allProjects === true,
					poll: options.poll === true || options.pollForever === true,
					pollForever: options.pollForever ? true : undefined,
					concurrency: options.concurrency,
					exitWhenIdle: options.exitWhenIdle === false ? false : undefined,
					pollIntervalMs: options.pollIntervalMs,
					maxPollCycles: options.maxPollCycles,
					...(isolatedWorktrees ? { isolatedWorktrees } : {}),
				},
			});
		});
}

function registerDaemonCommand(
	program: Command,
	setCommand: (command: CliCommand) => void,
): void {
	program
		.command("daemon")
		.description("run the production or CLI-only daemon")
		.option("--cli-only", "run only the CLI polling daemon")
		.option("--poll-forever", "poll continuously in CLI-only mode")
		.option("--all-projects", "poll all projects in CLI-only mode")
		.action((options: DaemonCommanderOptions, command: Command) => {
			if ((options.pollForever || options.allProjects) && !options.cliOnly) {
				command.error(
					"daemon polling flags require --cli-only; use devos daemon for the full production daemon",
				);
			}
			if (options.allProjects && !options.pollForever) {
				command.error("daemon --all-projects requires --poll-forever");
			}
			if (options.cliOnly) {
				setCommand({
					kind: "daemon",
					cliOnly: true,
					pollForever: options.pollForever ? true : undefined,
					allProjects: options.allProjects ? true : undefined,
				});
				return;
			}
			setCommand({ kind: "daemon" });
		});
}

function registerOnboardCommand(
	program: Command,
	setCommand: (command: CliCommand) => void,
): void {
	program
		.command("onboard")
		.description("run or validate guided onboarding")
		.option("--check", "validate prerequisites without the wizard")
		.action((options: OnboardCommanderOptions) => {
			setCommand({ kind: "onboard", check: options.check === true });
		});
}

function registerStatusCommand(
	program: Command,
	setCommand: (command: CliCommand) => void,
): void {
	program
		.command("status")
		.description("inspect persisted run state")
		.requiredOption("--project <PROJECT_ID>", "configured project identifier")
		.requiredOption("--issue <LINEAR_KEY>", "Linear issue key")
		.action((options: StatusCommanderOptions) => {
			setCommand({
				kind: "status",
				issueKey: options.issue ?? "",
				projectId: options.project ?? "",
			});
		});
}

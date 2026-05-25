import { createAgentAdapter } from "adapters";
import type { TaskCommand } from "../../../args";
import { type LoadedConfig, getProjectById } from "../../config";
import { createBoardTaskCreator } from "../../task-intake/board-task-creator";
import { readStdinText, withQuestionReader } from "../../task-intake/io";
import { resolveTaskIntake, runTaskIntake } from "../../task-intake/run";
import type {
	TaskIntakeResolveResult,
	TaskIntakeRunResult,
} from "../../task-intake/types/task-intake.types";
import { resolveTaskCreateRequest } from "./task-command-request";

export async function handleTaskCommand(
	config: LoadedConfig,
	command: TaskCommand,
): Promise<void> {
	const project = command.projectId
		? getProjectById(config, command.projectId)
		: config.projects[0];
	if (command.projectId && !project) {
		throw new Error(`Project '${command.projectId}' not found`);
	}
	if (!project) {
		throw new Error("No project is configured");
	}
	const agent = createAgentAdapter(project);
	const taskCreator = createBoardTaskCreator(project);
	const result = command.nonInteractive
		? await runTaskCommand(project, agent, taskCreator, command.intakeOnly, {
				request: resolveNonInteractiveTaskRequest(command.request),
				maxClarificationRounds: command.maxClarificationRounds,
				initialAnswers: command.clarificationAnswers,
				allowInteractiveQuestions: false,
				askQuestion: async () => "",
			})
		: await withQuestionReader(async (askQuestion) => {
				const request = await resolveTaskCreateRequest({
					request: command.request,
					askQuestion,
					readStdin: readStdinText,
				});
				return runTaskCommand(project, agent, taskCreator, command.intakeOnly, {
					request,
					maxClarificationRounds: command.maxClarificationRounds,
					initialAnswers: command.clarificationAnswers,
					askQuestion,
				});
			});
	writeTaskCreateResult(result, command.json === true);
}

function runTaskCommand(
	project: Parameters<typeof runTaskIntake>[0],
	agent: Parameters<typeof runTaskIntake>[1],
	taskCreator: Parameters<typeof runTaskIntake>[2],
	intakeOnly: boolean | undefined,
	options: Parameters<typeof runTaskIntake>[3],
): Promise<TaskIntakeRunResult | TaskIntakeResolveResult> {
	return intakeOnly
		? resolveTaskIntake(project, agent, options)
		: runTaskIntake(project, agent, taskCreator, options);
}

function writeTaskCreateResult(
	result: TaskIntakeRunResult | TaskIntakeResolveResult,
	json: boolean,
): void {
	if (json) {
		process.stdout.write(`${JSON.stringify(result)}\n`);
		return;
	}
	if (result.status === "created") {
		process.stdout.write(
			`Created task ${result.task.taskKey}: ${result.task.title}\n`,
		);
		return;
	}
	if (result.status === "ready") {
		process.stdout.write(`Resolved task: ${result.task.title}\n`);
		return;
	}
	process.stdout.write(
		`${[
			"Task requirements are still unclear; no board task was created.",
			"Remaining questions:",
			...result.questions.map((question) => `- ${question.question}`),
		].join("\n")}\n`,
	);
}

function resolveNonInteractiveTaskRequest(request: string | undefined): string {
	if (!request || request === "-") {
		throw new Error("task create --non-interactive requires --request <TEXT>");
	}
	const trimmedRequest = request.trim();
	if (!trimmedRequest) {
		throw new Error("task create requires a non-empty request");
	}
	return trimmedRequest;
}

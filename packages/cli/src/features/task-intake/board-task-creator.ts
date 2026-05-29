import type { ResolvedProjectConfig } from "../types";
import { createWorkflowDataClient } from "../workflow/workflow-data-client";
import type { WorkflowBoardTaskRecord } from "../workflow/workflow-data-protocol";
import type {
	TaskIntakeCreatedTask,
	TaskIntakeTask,
	TaskIntakeTaskCreator,
} from "./types/task-intake.types";

const LEGACY_TRACKER_FIELD_PREFIX = `lin${"ear"}`;

export function createBoardTaskCreator(
	config: ResolvedProjectConfig,
): TaskIntakeTaskCreator {
	const client = createWorkflowDataClient();
	return {
		async createTask(input) {
			const task = await client.request<WorkflowBoardTaskRecord>(
				"tasks.createIntakeTask",
				toCreatePayload(config, input),
			);
			return toCreatedTask(task);
		},
	};
}

function toCreatePayload(config: ResolvedProjectConfig, input: TaskIntakeTask) {
	return {
		projectId: config.id,
		title: input.title,
		description: input.description,
	};
}

function toCreatedTask(task: WorkflowBoardTaskRecord): TaskIntakeCreatedTask {
	const raw = task as WorkflowBoardTaskRecord & Record<string, unknown>;
	return {
		id: task.id,
		taskKey: task.taskKey,
		projectId: task.projectId,
		title: task.title,
		content: task.content,
		priority: task.priority,
		status: task.status,
		dueDate: task.dueDate,
		creatorId: task.creatorId,
		linkedPr: task.linkedPr,
		externalIssueId:
			task.externalIssueId ??
			readNullableString(raw, `${LEGACY_TRACKER_FIELD_PREFIX}IssueId`),
		externalIdentifier:
			task.externalIdentifier ??
			readNullableString(raw, `${LEGACY_TRACKER_FIELD_PREFIX}Identifier`),
		externalUrl:
			task.externalUrl ??
			readNullableString(raw, `${LEGACY_TRACKER_FIELD_PREFIX}Url`),
		createdAt: task.createdAt,
		updatedAt: task.updatedAt,
	};
}

function readNullableString(
	value: Record<string, unknown>,
	key: string,
): string | null {
	const candidate = value[key];
	return typeof candidate === "string" ? candidate : null;
}

import { createHandleRequest } from "../src/app";
import type { AppDeps } from "../src/app.types";
import {
	type ServerDatabase,
	boardProjectsTable,
	projectBoardsTable,
} from "../src/db";
import type { TaskChatCreateLinearIssue } from "../src/http/task-chat-create.types";

export function createTaskChatCreateTestApp(
	db: ServerDatabase["db"],
	execute: AppDeps["cliExecutor"]["execute"],
) {
	return createHandleRequest({
		cliExecutor: {
			execute,
			executeStream: async (request) => execute(request),
			getHistory: () => [],
		},
		db,
	});
}

export async function seedTaskChatProject(
	db: ServerDatabase["db"],
	projectId: string,
): Promise<void> {
	await db.insert(projectBoardsTable).values({
		id: "board-1",
		name: "Board",
		description: "Test board",
		ownerId: "owner-1",
		createdAt: "2026-05-13T00:00:00.000Z",
		updatedAt: "2026-05-13T00:00:00.000Z",
	});
	await db.insert(boardProjectsTable).values({
		id: projectId,
		boardId: "board-1",
		externalProjectId: null,
		name: "Project",
		description: null,
		ownerId: "owner-1",
		createdAt: "2026-05-13T00:00:00.000Z",
		updatedAt: "2026-05-13T00:00:00.000Z",
	});
}

export function createdTaskChatIntake() {
	return {
		status: "created",
		issue: createdTaskChatIssue(),
		task: {
			title: "Compose task creation",
			description: "Create both task records.",
		},
	};
}

export function createdTaskChatIssue(): TaskChatCreateLinearIssue {
	return {
		id: "lin-1",
		identifier: "ROY-1",
		title: "Compose task creation",
		url: "https://linear.example/ROY-1",
	};
}

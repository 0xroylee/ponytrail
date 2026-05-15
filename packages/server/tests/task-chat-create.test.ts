import { afterEach, describe, expect, it } from "bun:test";
import { createBoardRepository } from "../src/board";
import { boardTasksTable } from "../src/db";
import type { BoardTaskRow } from "../src/db/board-tasks.types";
import type { TaskChatCreateLinearIssue } from "../src/http/task-chat-create.types";
import {
	type DrizzleServerTestDatabase,
	createDrizzleServerTestDatabase,
} from "./server-db-test-helpers";
import {
	createTaskChatCreateTestApp,
	createdTaskChatIntake,
	createdTaskChatIssue,
	seedTaskChatProject,
} from "./task-chat-create-test-helpers";

let testDatabase: DrizzleServerTestDatabase | undefined;

afterEach(async () => {
	if (testDatabase) {
		await testDatabase.cleanup();
		testDatabase = undefined;
	}
});

describe("chat task create route", () => {
	it("creates and links a board task from structured task intake output", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		await seedTaskChatProject(testDatabase.db, "project-1");
		const calls: unknown[] = [];
		const app = createTaskChatCreateTestApp(
			testDatabase.db,
			async (request) => {
				calls.push(request);
				return {
					status: "succeeded",
					request,
					commandResult: {
						code: 0,
						stdout: `${JSON.stringify(createdTaskChatIntake())}\n`,
						stderr: "",
					},
				};
			},
		);

		const response = await app(
			new Request("http://localhost/api/tasks/chat-create", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					request: "Create the composed flow",
					projectId: "project-1",
					answers: [{ question: "Where?", answer: "Web" }],
				}),
			}),
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			status: string;
			issue: TaskChatCreateLinearIssue;
			task: BoardTaskRow;
		};
		expect(body.status).toBe("created");
		expect(body.issue.identifier).toBe("ROY-1");
		expect(body.task.title).toBe("Compose task creation");
		expect(body.task.content).toBe("Create both task records.");
		expect(body.task.status).toBe("planning");
		expect(body.task.linkedPr).toBe("https://linear.example/ROY-1");
		const board = await createBoardRepository(
			testDatabase.db,
		).getWorkspaceProjectBoard("owner-1", "project-1");
		expect(
			board?.statusColumns.find((column) => column.status === "planning")
				?.tasks,
		).toHaveLength(1);
		expect(calls).toEqual([
			{
				action: "task",
				taskAction: "create",
				request: "Create the composed flow",
				projectId: "project-1",
				nonInteractive: true,
				clarificationAnswers: [{ question: "Where?", answer: "Web" }],
				json: true,
			},
		]);
	});

	it("returns needs_info from task intake without creating a board task", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		await seedTaskChatProject(testDatabase.db, "project-1");
		const app = createTaskChatCreateTestApp(
			testDatabase.db,
			async (request) => ({
				status: "succeeded",
				request,
				commandResult: {
					code: 0,
					stdout: '{"status":"needs_info","questions":["Which project?"]}\n',
					stderr: "",
				},
			}),
		);

		const response = await app(
			new Request("http://localhost/api/tasks/chat-create", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					request: "Create something",
					projectId: "project-1",
				}),
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: "needs_info",
			questions: ["Which project?"],
		});
	});

	it("creates a Linear issue without a board task when project id is omitted", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		const calls: unknown[] = [];
		const app = createTaskChatCreateTestApp(
			testDatabase.db,
			async (request) => {
				calls.push(request);
				return {
					status: "succeeded",
					request,
					commandResult: {
						code: 0,
						stdout: `${JSON.stringify(createdTaskChatIntake())}\n`,
						stderr: "",
					},
				};
			},
		);

		const response = await app(
			new Request("http://localhost/api/tasks/chat-create", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					request: "Create something unassigned",
				}),
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: "created",
			issue: createdTaskChatIssue(),
		});
		expect(await testDatabase.db.select().from(boardTasksTable)).toEqual([]);
		expect(calls).toEqual([
			{
				action: "task",
				taskAction: "create",
				request: "Create something unassigned",
				projectId: undefined,
				nonInteractive: true,
				clarificationAnswers: undefined,
				json: true,
			},
		]);
	});

	it("returns db_error when the board task cannot be created", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		const app = createTaskChatCreateTestApp(
			testDatabase.db,
			async (request) => ({
				status: "succeeded",
				request,
				commandResult: {
					code: 0,
					stdout: `${JSON.stringify(createdTaskChatIntake())}\n`,
					stderr: "",
				},
			}),
		);

		const response = await app(
			new Request("http://localhost/api/tasks/chat-create", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					request: "Create something",
					projectId: "missing-project",
				}),
			}),
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as { status: string; error: string };
		expect(body.status).toBe("db_error");
		expect(body.error).toBe("Project not found");
	});

	it("returns linear_error when task intake or Linear creation fails", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		await seedTaskChatProject(testDatabase.db, "project-1");
		const app = createTaskChatCreateTestApp(
			testDatabase.db,
			async (request) => ({
				status: "failed",
				request,
				error: "Linear API rejected the issue",
			}),
		);

		const response = await app(
			new Request("http://localhost/api/tasks/chat-create", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					request: "Create something",
					projectId: "project-1",
				}),
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: "linear_error",
			error: "Linear API rejected the issue",
		});
	});
});

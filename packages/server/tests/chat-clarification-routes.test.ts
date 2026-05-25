import { afterEach, describe, expect, it } from "bun:test";
import { createJsonRequest, createServerTestApp } from "./app-test-helpers";
import {
	type DrizzleServerTestDatabase,
	createDrizzleServerTestDatabase,
} from "./server-db-test-helpers";

let testDatabase: DrizzleServerTestDatabase | undefined;

afterEach(async () => {
	if (testDatabase) {
		await testDatabase.cleanup();
		testDatabase = undefined;
	}
});

describe("chat clarification routes", () => {
	it("renders only the current clarification question in assistant text", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		const app = createServerTestApp(testDatabase.db, {
			cliExecutor: {
				execute: async (request) => ({
					status: "succeeded",
					request,
					commandResult: {
						code: 0,
						stdout:
							'{"status":"needs_info","questions":["Which agent?","What scope?"]}\n',
						stderr: "",
					},
				}),
				executeStream: async (request) => ({ status: "succeeded", request }),
				getHistory: () => [],
			},
			workspacePath: testDatabase.path,
		});
		const created = await app(
			createJsonRequest("POST", "/api/chat/sessions", {}),
		);
		const session = (await created.json()) as { id: string };
		const unclear = await app(
			createJsonRequest("POST", `/api/chat/sessions/${session.id}/send`, {
				content: "Route agent choice",
			}),
		);
		const body = (await unclear.json()) as {
			messages: Array<{ content: string; kind: string }>;
			session: { pendingQuestions: Array<{ question: string }> };
		};

		expect(body.session.pendingQuestions).toEqual([
			{ question: "Which agent?" },
			{ question: "What scope?" },
		]);
		expect(body.messages[1]?.content).toContain("Which agent?");
		expect(body.messages[1]?.content).not.toContain("What scope?");
	});

	it("keeps unclear tasks in backlog and moves answered tasks to plan", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		const cliCalls: unknown[] = [];
		let callCount = 0;
		const app = createServerTestApp(testDatabase.db, {
			cliExecutor: {
				execute: async (request) => {
					cliCalls.push(request);
					callCount += 1;
					return {
						status: "succeeded",
						request,
						commandResult: {
							code: 0,
							stdout: intakeOutput(callCount),
							stderr: "",
						},
					};
				},
				executeStream: async (request) => ({ status: "succeeded", request }),
				getHistory: () => [],
			},
			workspacePath: testDatabase.path,
		});
		const created = await app(
			createJsonRequest("POST", "/api/chat/sessions", {}),
		);
		const session = (await created.json()) as { id: string; taskId: string };

		const unclear = await app(
			createJsonRequest("POST", `/api/chat/sessions/${session.id}/send`, {
				content: "Route agent choice",
			}),
		);
		const unclearBody = (await unclear.json()) as {
			issue: { id: string; status: string; title: string };
			messages: Array<{ kind: string }>;
			session: {
				pendingQuestions: Array<{ question: string; options?: unknown[] }>;
				pendingRequest: string | null;
			};
		};

		expect(unclearBody.issue).toMatchObject({
			id: session.taskId,
			status: "backlog",
			title: "Untitled chat",
		});
		expect(unclearBody.session.pendingRequest).toBe("Route agent choice");
		expect(unclearBody.session.pendingQuestions).toEqual([
			{
				question: "Which agent?",
				options: [
					{ label: "Codex", value: "codex" },
					{ label: "Claude", value: "claude" },
				],
			},
		]);
		expect(unclearBody.messages[1]?.kind).toBe("clarification");

		const answered = await app(
			createJsonRequest("POST", `/api/chat/sessions/${session.id}/send`, {
				content: "codex",
				answers: [{ question: "Which agent?", answer: "codex" }],
			}),
		);
		const answeredBody = (await answered.json()) as {
			issue: { content: string; id: string; status: string; title: string };
			session: { pendingQuestions: unknown[]; pendingRequest: string | null };
		};

		expect(answeredBody.issue).toMatchObject({
			id: session.taskId,
			title: "Route agent choice",
			content: "Use the selected agent.",
			status: "plan",
		});
		expect(answeredBody.session.pendingQuestions).toEqual([]);
		expect(answeredBody.session.pendingRequest).toBeNull();
		expect(cliCalls).toMatchObject([
			{ request: "Route agent choice", clarificationAnswers: [] },
			{
				request: "Route agent choice",
				clarificationAnswers: [{ question: "Which agent?", answer: "codex" }],
			},
		]);
	});
});

function intakeOutput(callCount: number): string {
	return callCount === 1
		? '{"status":"needs_info","questions":[{"question":"Which agent?","options":[{"label":"Codex","value":"codex"},{"label":"Claude","value":"claude"}]}]}\n'
		: '{"status":"ready","task":{"title":"Route agent choice","description":"Use the selected agent."}}\n';
}

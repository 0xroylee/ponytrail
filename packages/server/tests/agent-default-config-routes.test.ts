import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { instanceConfigPath } from "devos/features/config/home-paths";
import {
	createInstanceConfig,
	loadInstanceConfig,
	renderInstanceConfigDocument,
} from "devos/features/onboard/instance-config";
import { createJsonRequest, createServerTestApp } from "./app-test-helpers";
import {
	type DrizzleServerTestDatabase,
	createDrizzleServerTestDatabase,
} from "./server-db-test-helpers";

let previousHome: string | undefined;
let testHomeDir: string | undefined;
let testDatabase: DrizzleServerTestDatabase | undefined;

const WORKSPACE_PATH = "/tmp/project";

describe("config-backed default agents", () => {
	beforeEach(async () => {
		previousHome = process.env.HOME;
		testHomeDir = await mkdtemp(path.join(process.cwd(), ".tmp-agent-home-"));
		process.env.HOME = testHomeDir;
	});

	afterEach(async () => {
		if (testDatabase) {
			await testDatabase.cleanup();
			testDatabase = undefined;
		}
		process.env.HOME = previousHome;
		const homeDir = testHomeDir;
		previousHome = undefined;
		testHomeDir = undefined;
		if (homeDir) {
			await rm(homeDir, { recursive: true, force: true });
		}
	});

	it("lists workflow agents from instance config when no agents are persisted", async () => {
		await writeInstanceConfig({
			codex: {
				models: {
					brainstorm: "gpt-5.4-mini",
					plan: "gpt-5.5",
					implement: "gpt-5.3-codex",
					reviewTest: "gpt-5.3-codex",
				},
				reasoningEfforts: {
					brainstorm: "xhigh",
					plan: "high",
					implement: "medium",
					reviewTest: "medium",
				},
			},
		});
		const response = await (await createApp())(
			new Request("http://localhost/api/agents"),
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.map((agent: { id: string }) => agent.id)).toEqual([
			"brainstorm",
			"plan",
			"implement",
			"testing",
		]);
		expect(body).toContainEqual(
			expect.objectContaining({
				id: "brainstorm",
				name: "Brainstorm",
				backend: "codex",
				runtime: "codex",
				model: "gpt-5.4-mini",
				reasoningEffort: "xhigh",
			}),
		);
		expect(body).toContainEqual(
			expect.objectContaining({
				id: "testing",
				name: "Testing",
				model: "gpt-5.3-codex",
				reasoningEffort: "medium",
			}),
		);
	});

	it("updates config-backed agent model settings through the agent API", async () => {
		await writeInstanceConfig();
		const response = await (await createApp())(
			createJsonRequest("PATCH", "/api/agents/brainstorm", {
				model: "gpt-5.4-mini",
				reasoningEffort: "xhigh",
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			id: "brainstorm",
			model: "gpt-5.4-mini",
			reasoningEffort: "xhigh",
		});
		const loaded = await loadInstanceConfig(WORKSPACE_PATH);
		expect(loaded.ok).toBe(true);
		if (!loaded.ok) return;
		expect(loaded.config.codex?.models?.brainstorm).toBe("gpt-5.4-mini");
		expect(loaded.config.codex?.reasoningEfforts?.brainstorm).toBe("xhigh");
	});
});

async function writeInstanceConfig(
	overrides: Record<string, unknown> = {},
): Promise<void> {
	const config = {
		...createInstanceConfig(WORKSPACE_PATH, "2026-05-30T00:00:00.000Z"),
		...overrides,
	};
	await mkdir(path.dirname(instanceConfigPath()), { recursive: true });
	await writeFile(instanceConfigPath(), renderInstanceConfigDocument(config));
}

async function createApp() {
	testDatabase = await createDrizzleServerTestDatabase();
	return createServerTestApp(testDatabase.db, {
		workspacePath: WORKSPACE_PATH,
	});
}

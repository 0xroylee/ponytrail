import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { loadConfig } from "../src/config";

const envKeys = [
	"LINEAR_API_KEY",
	"LINEAR_STATUS_ASSIGNED",
	"LINEAR_STATUS_PLANNING",
	"LINEAR_STATUS_IMPLEMENTING",
	"LINEAR_STATUS_PR_CREATED",
	"LINEAR_STATUS_REVIEWING",
	"LINEAR_STATUS_TESTING",
	"LINEAR_STATUS_BLOCKED",
	"LINEAR_STATUS_DONE",
	"PIV_WORKSPACE_PATH",
	"PIV_EXECUTION_PATH",
	"CODEX_SANDBOX",
	"CODEX_HOME",
	"CODEX_MODEL_PLAN",
	"CODEX_MODEL_IMPLEMENT",
	"CODEX_MODEL_REVIEW_TEST",
	"PIV_STATE_STORE",
	"PIV_SQLITE_PATH",
	"PIV_POLL_INTERVAL_MS",
	"PIV_MAX_POLL_CYCLES",
	"PIV_EXIT_WHEN_IDLE",
] as const;

const previousEnv: Record<string, string | undefined> = {};

describe("loadConfig", () => {
	beforeEach(() => {
		for (const key of envKeys) {
			previousEnv[key] = process.env[key];
			process.env[key] =
				key === "CODEX_SANDBOX"
					? "workspace-write"
					: key === "CODEX_HOME"
						? ""
						: key === "PIV_POLL_INTERVAL_MS"
							? "30000"
							: key === "PIV_MAX_POLL_CYCLES"
								? ""
								: key === "PIV_EXIT_WHEN_IDLE"
									? "1"
									: key === "PIV_STATE_STORE"
										? "json"
										: key === "PIV_SQLITE_PATH"
											? ""
											: key.toLowerCase();
		}
	});

	afterEach(() => {
		for (const key of envKeys) {
			process.env[key] = previousEnv[key];
		}
	});

	it("loads required env values", async () => {
		const config = await loadConfig(process.cwd());
		expect(config.projects[0]?.linear.apiKey).toBe("linear_api_key");
		expect(config.projects[0]?.linear.statusMap.assigned).toBe(
			"linear_status_assigned",
		);
		expect(config.projects[0]?.executionPath).toBe("piv_execution_path");
		expect(config.projects[0]?.polling.intervalMs).toBe(30000);
		expect(config.projects[0]?.polling.maxCycles).toBeUndefined();
		expect(config.projects[0]?.polling.exitWhenIdle).toBe(true);
	});

	it("loads polling values from env", async () => {
		process.env.PIV_POLL_INTERVAL_MS = "15000";
		process.env.PIV_MAX_POLL_CYCLES = "20";
		process.env.PIV_EXIT_WHEN_IDLE = "0";
		const config = await loadConfig(process.cwd());
		expect(config.projects[0]?.polling.intervalMs).toBe(15000);
		expect(config.projects[0]?.polling.maxCycles).toBe(20);
		expect(config.projects[0]?.polling.exitWhenIdle).toBe(false);
	});

	it("disables codex sandbox by default", async () => {
		process.env.CODEX_SANDBOX = undefined;
		const config = await loadConfig(process.cwd());
		expect(config.projects[0]?.codex.sandbox).toBeUndefined();
	});

	it("enables codex sandbox when configured", async () => {
		process.env.CODEX_SANDBOX = "read-only";
		const config = await loadConfig(process.cwd());
		expect(config.projects[0]?.codex.sandbox).toBe("read-only");
	});

	it("uses codex cli default home unless CODEX_HOME is set", async () => {
		process.env.CODEX_HOME = "";
		const defaultConfig = await loadConfig(process.cwd());
		expect(defaultConfig.projects[0]?.codex.codexHome).toBeUndefined();

		process.env.CODEX_HOME = "/tmp/custom-codex-home";
		const overrideConfig = await loadConfig(process.cwd());
		expect(overrideConfig.projects[0]?.codex.codexHome).toBe(
			"/tmp/custom-codex-home",
		);
	});

	it("loads stage-specific codex models from env", async () => {
		process.env.CODEX_MODEL_PLAN = "gpt-5.5";
		process.env.CODEX_MODEL_IMPLEMENT = "gpt-5.3-codex";
		process.env.CODEX_MODEL_REVIEW_TEST = "gpt-5.3-codex";
		const config = await loadConfig(process.cwd());
		expect(config.projects[0]?.codex.models?.plan).toBe("gpt-5.5");
		expect(config.projects[0]?.codex.models?.implement).toBe("gpt-5.3-codex");
		expect(config.projects[0]?.codex.models?.reviewTest).toBe("gpt-5.3-codex");
	});

	it("defaults state store to json", async () => {
		process.env.PIV_STATE_STORE = undefined;
		const config = await loadConfig(process.cwd());
		expect(config.projects[0]?.stateStore.type).toBe("json");
		expect(config.projects[0]?.stateStore.sqlitePath).toBeUndefined();
	});

	it("loads sqlite state store config from env", async () => {
		process.env.PIV_STATE_STORE = "sqlite";
		process.env.PIV_SQLITE_PATH = "/tmp/piv-state.sqlite";
		const config = await loadConfig(process.cwd());
		expect(config.projects[0]?.stateStore.type).toBe("sqlite");
		expect(config.projects[0]?.stateStore.sqlitePath).toBe(
			"/tmp/piv-state.sqlite",
		);
	});

	it("throws on invalid state store type", async () => {
		process.env.PIV_STATE_STORE = "redis";
		await expect(loadConfig(process.cwd())).rejects.toThrow(
			"Invalid PIV_STATE_STORE value",
		);
	});
});

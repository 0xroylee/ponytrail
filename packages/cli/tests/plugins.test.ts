import { describe, expect, it } from "bun:test";
import type { LoadedConfig } from "../src/features/config";
import {
	handlePluginsCommand,
	listPluginTemplates,
	parsePluginTemplate,
} from "../src/features/plugins";

const config = {} as LoadedConfig;

describe("plugins catalog", () => {
	it("loads bundled RTK token optimizer template", async () => {
		const templates = await listPluginTemplates();
		const rtk = templates.find((plugin) => plugin.id === "rtk-token-optimizer");

		expect(rtk?.title).toBe("RTK binary");
		expect(rtk?.source.githubRepo).toBe("https://github.com/rtk-ai/rtk");
		expect(rtk?.checks[0]).toMatchObject({
			command: "rtk",
			args: ["--version"],
		});
	});

	it("rejects malformed plugin templates", () => {
		expect(() => parsePluginTemplate({ id: "bad" })).toThrow(
			"plugin template.schemaVersion must be 1",
		);
	});
});

describe("handlePluginsCommand", () => {
	it("lists plugins with enabled state from sqlite env", async () => {
		const output = await captureStdout(() =>
			handlePluginsCommand(config, { action: "list" }, "/tmp/work", {
				loadEnv: async () => ({
					DEVOS_ENABLED_PLUGINS: "rtk-token-optimizer",
				}),
			}),
		);

		expect(output).toContain("rtk-token-optimizer\tRTK binary\tenabled");
	});

	it("shows plugin templates as formatted json", async () => {
		const output = await captureStdout(() =>
			handlePluginsCommand(
				config,
				{ action: "show", pluginId: "rtk-token-optimizer" },
				"/tmp/work",
			),
		);

		expect(JSON.parse(output).id).toBe("rtk-token-optimizer");
	});

	it("prints install instructions without executing commands", async () => {
		let called = false;
		const output = await captureStdout(() =>
			handlePluginsCommand(
				config,
				{ action: "install", pluginId: "rtk-token-optimizer" },
				"/tmp/work",
				{
					runCommand: async () => {
						called = true;
						return { code: 0, stdout: "", stderr: "" };
					},
				},
			),
		);

		expect(called).toBe(false);
		expect(output).toContain("RTK binary");
		expect(output).toContain("https://github.com/rtk-ai/rtk");
	});

	it("enables plugins in sqlite env without dropping existing values", async () => {
		const saves: Array<Record<string, string | undefined>> = [];
		await captureStdout(() =>
			handlePluginsCommand(
				config,
				{ action: "enable", pluginId: "rtk-token-optimizer" },
				"/tmp/work",
				{
					loadEnv: async () => ({
						DEVOS_ENABLED_PLUGINS: "other-plugin",
						CODEX_PLUGINS: "github@openai-curated",
					}),
					saveEnv: async (_cwd, updates) => {
						saves.push(updates);
					},
				},
			),
		);

		expect(saves).toEqual([
			{
				DEVOS_ENABLED_PLUGINS: "other-plugin,rtk-token-optimizer",
				CODEX_PLUGINS: "github@openai-curated",
			},
		]);
	});

	it("runs structured plugin checks", async () => {
		const calls: Array<{ command: string; args: string[] }> = [];
		const output = await captureStdout(() =>
			handlePluginsCommand(
				config,
				{ action: "check", pluginId: "rtk-token-optimizer" },
				"/tmp/work",
				{
					runCommand: async (command, args) => {
						calls.push({ command, args });
						return { code: 0, stdout: "ok", stderr: "" };
					},
				},
			),
		);

		expect(calls).toContainEqual({ command: "rtk", args: ["--version"] });
		expect(output).toContain("PASS\tVerify RTK is available");
	});

	it("fails when a plugin check fails", async () => {
		await expect(
			captureStdout(() =>
				handlePluginsCommand(
					config,
					{ action: "check", pluginId: "rtk-token-optimizer" },
					"/tmp/work",
					{
						runCommand: async () => ({
							code: 1,
							stdout: "",
							stderr: "missing",
						}),
					},
				),
			),
		).rejects.toThrow("Plugin rtk-token-optimizer check failed");
	});
});

async function captureStdout(action: () => Promise<void>): Promise<string> {
	const originalWrite = process.stdout.write;
	let output = "";
	process.stdout.write = ((chunk: string | Uint8Array) => {
		output += chunk.toString();
		return true;
	}) as typeof process.stdout.write;
	try {
		await action();
		return output;
	} finally {
		process.stdout.write = originalWrite;
	}
}

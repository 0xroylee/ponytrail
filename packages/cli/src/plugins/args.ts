import type { Command } from "commander";
import type {
	CliRuntime,
	PluginListCommanderOptions,
	PluginsCommand,
} from "../args.types";

export function registerPluginsCommand(
	program: Command,
	runtime: CliRuntime,
): void {
	const plugins = program.command("plugins").description("manage CLI plugins");
	plugins
		.command("list")
		.option("--enabled", "show enabled plugins only")
		.action(async (options: PluginListCommanderOptions) => {
			await handlePlugins(runtime, {
				action: "list",
				enabledOnly: options.enabled,
			});
		});
	plugins.command("show <PLUGIN_ID>").action(async (pluginId: string) => {
		await handlePlugins(runtime, { action: "show", pluginId });
	});
	plugins.command("install <PLUGIN_ID>").action(async (pluginId: string) => {
		await handlePlugins(runtime, { action: "install", pluginId });
	});
	plugins.command("enable <PLUGIN_ID>").action(async (pluginId: string) => {
		await handlePlugins(runtime, { action: "enable", pluginId });
	});
	plugins.command("check <PLUGIN_ID>").action(async (pluginId: string) => {
		await handlePlugins(runtime, { action: "check", pluginId });
	});
}

async function handlePlugins(
	runtime: CliRuntime,
	command: PluginsCommand,
): Promise<void> {
	const config = await runtime.loadConfig();
	await runtime.handlePluginsCommand(config, command, runtime.cwd);
}

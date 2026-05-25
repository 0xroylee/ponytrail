import type { CreateDevosWorkflowOptions } from "./types/workflow.types";

export function parseCreateWorkflowArgs(
	args: string[],
): CreateDevosWorkflowOptions & { json: boolean } {
	const options: Partial<CreateDevosWorkflowOptions> & { json: boolean } = {
		json: false,
	};
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (!arg.startsWith("--")) {
			if (options.outputPath) throw new Error(`Unexpected argument: ${arg}`);
			options.outputPath = arg;
			continue;
		}
		if (arg === "--force") {
			options.force = true;
			continue;
		}
		if (arg === "--json") {
			options.json = true;
			continue;
		}
		throw new Error(`Unknown option: ${arg}`);
	}
	return options as CreateDevosWorkflowOptions & { json: boolean };
}

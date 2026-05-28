import type { LoadedConfig } from "../../config";
import type { ResolvedProjectConfig, RunOptions } from "../../types";
import type { WorkflowManagerDeps } from "../types/workflow-scheduler.types";
import type { WorkflowRuntime } from "../types/workflow.types";
import { ProjectContextResolver } from "./project-context-resolver";
import { WorkflowScheduler } from "./workflow-scheduler";

export class WorkflowManager<TProject extends ResolvedProjectConfig> {
	constructor(
		private readonly config: LoadedConfig,
		private readonly options: RunOptions,
		private readonly runtime: WorkflowRuntime,
		private readonly deps: WorkflowManagerDeps<TProject>,
	) {}

	async run(): Promise<void> {
		const polling = this.deps.resolvePolling(this.config, this.options);
		const contexts = await new ProjectContextResolver(
			this.config,
			this.options,
			this.runtime,
			this.deps,
		).resolve(polling);
		if (!contexts) return;
		await new WorkflowScheduler(this.options, this.runtime, this.deps).run(
			contexts,
			polling,
		);
	}
}

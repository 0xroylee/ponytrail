import type { LoadedConfig } from "../../config";
import type { ResolvedProjectConfig, RunOptions } from "../../types";
import type {
	ProjectContextResolverDeps,
	ProjectWorkflowContext,
} from "../types/workflow-scheduler.types";
import type { PollingSettings, WorkflowRuntime } from "../types/workflow.types";

export class ProjectContextResolver<TProject extends ResolvedProjectConfig> {
	constructor(
		private readonly config: LoadedConfig,
		private readonly options: RunOptions,
		private readonly runtime: WorkflowRuntime,
		private readonly deps: ProjectContextResolverDeps<TProject>,
	) {}

	async resolve(
		polling: PollingSettings,
	): Promise<Array<ProjectWorkflowContext<TProject>> | null> {
		const projects = this.deps.pickProjects(this.config, this.options, polling);
		if (projects.length === 0) {
			await this.deps.handleNoProjectSelection(
				polling,
				this.options,
				this.runtime,
			);
			return null;
		}

		let contexts = projects.map((project) => ({
			config: project,
			taskClient: this.runtime.createTaskClient(project),
		}));
		if (!this.shouldRouteTargetIssue(contexts.length, polling)) {
			return contexts;
		}
		contexts = await this.deps.routeProjectContextsForTargetIssue(
			contexts,
			this.options.issueArg ?? "",
		);
		return contexts.length > 0 ? contexts : null;
	}

	private shouldRouteTargetIssue(
		contextCount: number,
		polling: PollingSettings,
	): boolean {
		return Boolean(
			this.options.issueArg &&
				!this.options.projectId &&
				this.deps.usesAllProjectScope(this.options, polling) &&
				contextCount > 1,
		);
	}
}

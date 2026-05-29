import type { ResolvedProjectConfig, RunOptions } from "../../types";
import type {
	ProjectWorkflowContext,
	WorkflowSchedulerDeps,
} from "../types/workflow-scheduler.types";
import type { PollingSettings, WorkflowRuntime } from "../types/workflow.types";

export class WorkflowScheduler<TProject extends ResolvedProjectConfig> {
	constructor(
		private readonly options: RunOptions,
		private readonly runtime: WorkflowRuntime,
		private readonly deps: WorkflowSchedulerDeps<TProject>,
	) {}

	async run(
		contexts: Array<ProjectWorkflowContext<TProject>>,
		polling: PollingSettings,
	): Promise<void> {
		let cycle = 0;
		while (true) {
			cycle += 1;
			const cycleResult = await this.runCycle(contexts, polling, cycle);
			if (
				this.deps.shouldStopPolling({
					polling,
					options: this.options,
					cycle,
					...cycleResult,
				})
			) {
				await this.deps.handlePollingStopped({
					contexts,
					polling,
					cycle,
					...cycleResult,
				});
				return;
			}
			await this.deps.sleepForWorkflow(this.runtime, polling.intervalMs);
		}
	}

	private async runCycle(
		contexts: Array<ProjectWorkflowContext<TProject>>,
		polling: PollingSettings,
		cycle: number,
	): Promise<{ totalIssues: number; cycleHadError: boolean }> {
		let totalIssues = 0;
		let cycleHadError = false;
		for (const context of contexts) {
			try {
				totalIssues += await this.deps.runProjectCycle({
					project: context.config,
					taskClient: context.taskClient,
					cycle,
					polling,
				});
			} catch (error) {
				if (!polling.enabled || this.options.issueArg) throw error;
				cycleHadError = true;
				await this.deps.handleProjectCycleError({
					error,
					project: context.config,
					cycle,
					polling,
				});
			}
		}
		return { totalIssues, cycleHadError };
	}
}

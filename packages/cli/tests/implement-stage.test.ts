import { describe, expect, it, mock } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AgentAdapter, AgentAdapterRunRequest } from "adapters";
import type { ResolvedProjectConfig, RunState } from "../src/features/types";
import { handleImplementingStage } from "../src/features/workflow/implementation/implement-stage";
import type {
	WorkflowRuntime,
	WorkflowTaskClient,
} from "../src/features/workflow/types/workflow.types";

describe("handleImplementingStage", () => {
	it("reports no-op implementations with agent output context", async () => {
		const workspacePath = await mkdtemp(
			path.join(os.tmpdir(), "devos-implement-noop-"),
		);
		const config = createProject(workspacePath);
		const state = createRunState(workspacePath);
		const linkPullRequest = mock(async () => undefined);
		const taskClient = createTaskClient({ linkPullRequest });
		const createDraftPrFromWorktree = mock(async () => {
			throw new Error(
				"No staged changes found after implement step; cannot create PR",
			);
		});
		const runtime = createRuntime({ createDraftPrFromWorktree });
		const agent = createAgent("No code changes were necessary.");

		let thrown: unknown;
		try {
			await handleImplementingStage(config, agent, taskClient, state, runtime);
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(Error);
		expect((thrown as Error).message).toContain(
			"Implementation completed without file changes; no draft PR was created.",
		);
		expect((thrown as Error).message).toContain(
			"Agent output: No code changes were necessary.",
		);
		expect(state.implementationSummary).toBe("No code changes were necessary.");
		expect(linkPullRequest).not.toHaveBeenCalled();
	});
});

function createAgent(finalMessage: string): AgentAdapter {
	return {
		runAgent: mock(async (request: AgentAdapterRunRequest) => {
			expect(request.role).toBe("implementing");
			return {
				finalMessage,
				stdout: "",
				usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
			};
		}),
		runPlan: mock(async () => {
			throw new Error("runPlan should not be called");
		}),
		runTaskIntake: mock(async () => {
			throw new Error("runTaskIntake should not be called");
		}),
		resume: mock(async () => {
			throw new Error("resume should not be called");
		}),
		runReview: mock(async () => {
			throw new Error("runReview should not be called");
		}),
		runGithubComment: mock(async () => {
			throw new Error("runGithubComment should not be called");
		}),
	};
}

function createProject(workspacePath: string): ResolvedProjectConfig {
	return {
		id: "default",
		name: "default",
		workspacePath,
		executionPath: workspacePath,
		repo: { owner: "acme", name: "repo", baseBranch: "main" },
		github: { useGhCli: true, defaultBugLabel: "bug" },
		server: {
			database: {
				databasePath: path.join(workspacePath, ".devos", "config", "server-db"),
				port: 54329,
			},
		},
		codex: { binary: "codex", streamLogs: false },
		skills: {
			root: path.join(workspacePath, "skills"),
			brainstorm: path.join(workspacePath, "brainstorm.md"),
			plan: path.join(workspacePath, "plan.md"),
			implement: path.join(workspacePath, "implement.md"),
			reviewTest: path.join(workspacePath, "review.md"),
			githubComment: path.join(workspacePath, "github-comment.md"),
		},
		workflow: { issueConcurrency: 1 },
		dryRun: false,
	};
}

function createRunState(workspacePath: string): RunState {
	return {
		projectId: "default",
		projectName: "default",
		workspacePath,
		repository: { owner: "acme", name: "repo", baseBranch: "main" },
		issue: {
			id: "task_WOR-56",
			key: "WOR-56",
			title: "No-op implementation",
			url: "devos://tasks/WOR-56",
		},
		stage: "in_progress",
		codexSessionId: "session-1",
		planSummary: "Make the requested change.",
		bugs: [],
		startedAt: "2026-06-05T00:00:00.000Z",
		updatedAt: "2026-06-05T00:00:00.000Z",
	};
}

function createTaskClient(input: {
	linkPullRequest: WorkflowTaskClient["linkPullRequest"];
}): WorkflowTaskClient {
	return {
		fetchWork: async () => [],
		fetchIssueByIdentifier: async () => null,
		fetchReviewOnlyWork: async () => [],
		isAssignedState: async () => true,
		markStage: async () => undefined,
		markCanceled: async () => undefined,
		createBacklogTask: async () => ({
			id: "task-1",
			identifier: "WOR-56",
			title: "No-op implementation",
			url: "devos://tasks/WOR-56",
		}),
		createTodoIssueFromPlan: async () => ({
			id: "task-2",
			identifier: "WOR-57",
			title: "child",
			url: "devos://tasks/WOR-57",
		}),
		applyStageLabel: async () => undefined,
		clearWorkflowStageLabels: async () => undefined,
		comment: async () => undefined,
		linkPullRequest: input.linkPullRequest,
	};
}

function createRuntime(input: {
	createDraftPrFromWorktree: WorkflowRuntime["createDraftPrFromWorktree"];
}): WorkflowRuntime {
	return {
		createTaskClient: () => createTaskClient({ linkPullRequest: undefined }),
		createAgentAdapter: () => createAgent("unused"),
		ensureBaseBranchFresh: async () => undefined,
		ensureIssueWorktree: async () => "",
		prepareWorktreeDependencies: async () => undefined,
		removeIssueWorktree: async () => ({ removed: false }),
		findOpenPullRequestForIssue: async () => undefined,
		getPullRequestMergeStatus: async () => ({}),
		prepareImplementationBranch: async () => "WOR-56",
		createDraftPrFromWorktree: input.createDraftPrFromWorktree,
		updateDraftPrFromWorktree: async () => true,
		commentOnPr: async () => undefined,
		markPrReadyForReview: async () => true,
		squashMergePullRequest: async () => true,
		sendTaskOutcomeEmail: async () => undefined,
		sendHumanReviewRequiredEmail: async () => undefined,
	};
}

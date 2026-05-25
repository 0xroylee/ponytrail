import { describe, expect, it } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatEnvironmentPanel } from "../src/components/chat-room/chat-environment-panel";
import type { ChatMissionProgressViewModel } from "../src/components/chat-room/types/chat-mission-progress.types";
import { serverStateQueryKeys } from "../src/lib/api/query-keys";

describe("chat environment panel", () => {
	it("renders environment, skills, checkpoints, and draft actions", () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(
			serverStateQueryKeys.workspaceEnvironment("project-1"),
			{
				workspaceId: "workspace-1",
				projectId: "project-1",
				folder: "/workspace/project",
				git: {
					available: true,
					branch: "main",
					dirty: true,
					added: 12,
					deleted: 3,
					untracked: 1,
					reason: null,
				},
				mcps: [
					{
						id: "codegraph",
						label: "CodeGraph",
						available: true,
						detail: ".codegraph/codegraph.db",
					},
				],
			},
		);
		queryClient.setQueryData(serverStateQueryKeys.skills, [
			{
				id: "skill-1",
				name: "frontend-design",
				description: "Design UI",
				source: "folder",
				updatedAt: "2026-05-26T00:00:00.000Z",
			},
		]);

		const html = renderToStaticMarkup(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(ChatEnvironmentPanel, {
					missionProgress: missionProgress(),
					projectId: "project-1",
					onDraftCommand: () => undefined,
				}),
			),
		);
		const text = textContent(html);

		expect(text).toContain("Environment");
		expect(text).toContain("+12");
		expect(text).toContain("-3");
		expect(text).toContain("?1");
		expect(text).toContain("/workspace/project");
		expect(text).toContain("main");
		expect(text).toContain("Commit");
		expect(text).toContain("Create pull request");
		expect(text).toContain("CodeGraph");
		expect(text).toContain("frontend-design");
		expect(text).toContain("1/2");
	});
});

function missionProgress(): ChatMissionProgressViewModel {
	return {
		state: "ready",
		taskId: "task-1",
		taskKey: "TASK-1",
		title: "Build panel",
		status: "implementing",
		statusLabel: "Implementing",
		updatedAt: "2026-05-26T00:00:00.000Z",
		notes: [],
		executions: [
			{
				id: "execution-1",
				body: "",
				logLines: [],
				startedAt: "2026-05-26T00:00:00.000Z",
				status: "running",
				title: "Implementation",
				steps: [
					{
						id: "step-1",
						stepNumber: 1,
						action: "Backend endpoint",
						status: "succeeded",
						detail: null,
						recordedAt: "2026-05-26T00:00:00.000Z",
					},
					{
						id: "step-2",
						stepNumber: 2,
						action: "Panel UI",
						status: "running",
						detail: null,
						recordedAt: "2026-05-26T00:00:00.000Z",
					},
				],
			},
		],
		latestResult: null,
	};
}

function textContent(html: string): string {
	return html.replace(/<[^>]*>/g, "");
}

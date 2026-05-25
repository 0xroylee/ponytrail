import { describe, expect, it } from "bun:test";
import { createApiClient } from "../src/lib/api/client";
import { parseCurrentWorkspaceRecord } from "../src/lib/api/workspace-client";
import { parseWorkspaceEnvironmentResponse } from "../src/lib/api/workspace-environment-client";

function okJsonResponse(payload: unknown): Response {
	return new Response(JSON.stringify(payload), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

describe("workspace API client", () => {
	it("fetches the current workspace identity", async () => {
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			expect(String(input)).toBe("/api/workspace/current");
			expect(init?.method).toBe("GET");
			return okJsonResponse({
				workspaceId: "workspace-abcdef1234567890",
				name: "Roy Lab",
			});
		}) as typeof fetch;
		const client = createApiClient({ fetchFn });

		await expect(client.getCurrentWorkspace()).resolves.toEqual({
			workspaceId: "workspace-abcdef1234567890",
			name: "Roy Lab",
		});
	});

	it("validates current workspace payloads", () => {
		expect(() =>
			parseCurrentWorkspaceRecord({ workspaceId: "workspace-1" }),
		).toThrow("Invalid /api/workspace/current response field 'name'");
	});

	it("fetches current workspace environment", async () => {
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			expect(String(input)).toBe(
				"/api/workspace/environment?projectId=project-1",
			);
			expect(init?.method).toBe("GET");
			return okJsonResponse(workspaceEnvironmentPayload());
		}) as typeof fetch;
		const client = createApiClient({ fetchFn });

		await expect(client.getWorkspaceEnvironment("project-1")).resolves.toEqual(
			workspaceEnvironmentPayload(),
		);
	});

	it("validates workspace environment payloads", () => {
		expect(() =>
			parseWorkspaceEnvironmentResponse({
				...workspaceEnvironmentPayload(),
				git: { available: true },
			}),
		).toThrow("Invalid /api/workspace/environment response field 'branch'");
	});
});

function workspaceEnvironmentPayload() {
	return {
		workspaceId: "workspace-abcdef1234567890",
		projectId: "project-1",
		folder: "/workspace/project",
		git: {
			available: true,
			branch: "main",
			dirty: true,
			added: 10,
			deleted: 2,
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
	};
}

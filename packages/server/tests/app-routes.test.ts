import { describe, expect, it } from "bun:test";
import { createHandleRequest } from "../src/app";

describe("app routes", () => {
	it("keeps workspace current route GET-only", async () => {
		const app = createHandleRequest(createDeps());

		const getResponse = await app(
			new Request("http://localhost/api/workspace/current"),
		);
		const postResponse = await app(
			new Request("http://localhost/api/workspace/current", {
				method: "POST",
			}),
		);

		expect(getResponse.status).toBe(200);
		expect(await getResponse.json()).toEqual({
			workspaceId: "owner-1",
			name: "Default Workspace",
		});
		expect(postResponse.status).toBe(404);
	});
});

function createDeps() {
	return {
		cliExecutor: {
			execute: async () => ({
				status: "succeeded" as const,
				request: { action: "none" as const },
			}),
			executeStream: async () => ({
				status: "succeeded" as const,
				request: { action: "none" as const },
			}),
			getHistory: () => [],
		},
	};
}

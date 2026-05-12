import { describe, expect, it } from "bun:test";
import { createMonitoringApiClient } from "../src/monitoring/monitoring-client";

describe("monitoring api client", () => {
	it("fetches token usage successfully", async () => {
		const client = createMonitoringApiClient({
			baseUrl: "http://localhost:4000",
			fetchFn: async (input) => {
				expect(String(input)).toBe("http://localhost:4000/api/token-usage");
				return Response.json([
					{
						id: "tu-1",
						runId: "run-1",
						stage: "planning",
						inputTokens: 10,
						outputTokens: 5,
						totalTokens: 15,
						recordedAt: "2026-05-12T00:00:00.000Z",
					},
				]);
			},
		});

		await expect(client.listTokenUsage()).resolves.toEqual([
			{
				id: "tu-1",
				runId: "run-1",
				stage: "planning",
				inputTokens: 10,
				outputTokens: 5,
				totalTokens: 15,
				recordedAt: "2026-05-12T00:00:00.000Z",
			},
		]);
	});

	it("supports empty responses", async () => {
		const client = createMonitoringApiClient({
			fetchFn: async () => Response.json([]),
		});

		await expect(client.listJobs()).resolves.toEqual([]);
	});

	it("throws on non-2xx responses", async () => {
		const client = createMonitoringApiClient({
			fetchFn: async () =>
				new Response("boom", {
					status: 500,
					statusText: "Internal Server Error",
				}),
		});

		await expect(client.listAgents()).rejects.toThrow(
			"Monitoring request failed: 500 Internal Server Error",
		);
	});

	it("propagates network failures", async () => {
		const client = createMonitoringApiClient({
			fetchFn: async () => {
				throw new Error("network unreachable");
			},
		});

		await expect(client.listSkills()).rejects.toThrow("network unreachable");
	});
});

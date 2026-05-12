import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { MonitoringApiClient } from "../src/monitoring/monitoring-client.types";
import { monitoringQueryKeys } from "../src/monitoring/monitoring-query-keys";

const useQueryMock = mock(() => ({}));

mock.module("@tanstack/react-query", () => ({
	useQuery: useQueryMock,
}));

function createClient(): MonitoringApiClient {
	return {
		listTokenUsage: mock(async () => []),
		listJobs: mock(async () => []),
		listAgents: mock(async () => []),
		listSkills: mock(async () => []),
	};
}

describe("monitoring hooks", () => {
	beforeEach(() => {
		useQueryMock.mockClear();
	});

	it("uses stable token usage query options", async () => {
		const hooks = await import("../src/monitoring/monitoring-hooks");
		hooks.useTokenUsageQuery({ client: createClient() });

		expect(useQueryMock).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: monitoringQueryKeys.tokenUsage,
				initialData: [],
			}),
		);
	});

	it("uses stable jobs query options", async () => {
		const hooks = await import("../src/monitoring/monitoring-hooks");
		hooks.useJobsQuery({ client: createClient() });

		expect(useQueryMock).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: monitoringQueryKeys.jobs,
				initialData: [],
			}),
		);
	});

	it("uses stable agents query options", async () => {
		const hooks = await import("../src/monitoring/monitoring-hooks");
		hooks.useAgentsQuery({ client: createClient() });

		expect(useQueryMock).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: monitoringQueryKeys.agents,
				initialData: [],
			}),
		);
	});

	it("uses stable skills query options", async () => {
		const hooks = await import("../src/monitoring/monitoring-hooks");
		hooks.useSkillsQuery({ client: createClient() });

		expect(useQueryMock).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: monitoringQueryKeys.skills,
				initialData: [],
			}),
		);
	});
});

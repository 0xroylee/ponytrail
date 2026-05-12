import { describe, expect, it } from "bun:test";
import { monitoringQueryKeys } from "../src/monitoring/monitoring-query-keys";

describe("monitoring query keys", () => {
	it("defines stable keys for monitoring domains", () => {
		expect(monitoringQueryKeys.all).toEqual(["monitoring"]);
		expect(monitoringQueryKeys.tokenUsage).toEqual([
			"monitoring",
			"token-usage",
		]);
		expect(monitoringQueryKeys.jobs).toEqual(["monitoring", "jobs"]);
		expect(monitoringQueryKeys.agents).toEqual(["monitoring", "agents"]);
		expect(monitoringQueryKeys.skills).toEqual(["monitoring", "skills"]);
	});
});

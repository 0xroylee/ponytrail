import type {
	MonitoringApiClient,
	MonitoringClientConfig,
} from "./monitoring-client.types";
import type {
	AgentRecord,
	JobRecord,
	SkillRecord,
	TokenUsageRecord,
} from "./monitoring.types";

function joinUrl(baseUrl: string, path: string): string {
	const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
	return `${normalizedBase}${path}`;
}

async function requestJson<T>(
	baseUrl: string,
	path: string,
	fetchFn: typeof fetch,
): Promise<T> {
	const response = await fetchFn(joinUrl(baseUrl, path));
	if (!response.ok) {
		throw new Error(
			`Monitoring request failed: ${response.status} ${response.statusText}`,
		);
	}

	return (await response.json()) as T;
}

export function createMonitoringApiClient(
	config: MonitoringClientConfig = {},
): MonitoringApiClient {
	const baseUrl = config.baseUrl ?? "";
	const fetchFn = config.fetchFn ?? fetch;

	return {
		listTokenUsage: () =>
			requestJson<TokenUsageRecord[]>(baseUrl, "/api/token-usage", fetchFn),
		listJobs: () => requestJson<JobRecord[]>(baseUrl, "/api/jobs", fetchFn),
		listAgents: () =>
			requestJson<AgentRecord[]>(baseUrl, "/api/agents", fetchFn),
		listSkills: () =>
			requestJson<SkillRecord[]>(baseUrl, "/api/skills", fetchFn),
	};
}

import type {
	AgentRecord,
	JobRecord,
	SkillRecord,
	TokenUsageRecord,
} from "./monitoring.types";

export interface MonitoringClientConfig {
	baseUrl?: string;
	fetchFn?: typeof fetch;
}

export interface MonitoringApiClient {
	listTokenUsage(): Promise<TokenUsageRecord[]>;
	listJobs(): Promise<JobRecord[]>;
	listAgents(): Promise<AgentRecord[]>;
	listSkills(): Promise<SkillRecord[]>;
}

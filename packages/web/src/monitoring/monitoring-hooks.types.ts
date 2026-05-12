import type { UseQueryOptions } from "@tanstack/react-query";
import type { MonitoringApiClient } from "./monitoring-client.types";
import type {
	AgentRecord,
	JobRecord,
	SkillRecord,
	TokenUsageRecord,
} from "./monitoring.types";

export interface MonitoringHookArgs {
	client: MonitoringApiClient;
}

type MonitoringQueryOptions<TData> = Omit<
	UseQueryOptions<TData, Error, TData>,
	"queryKey" | "queryFn"
>;

export interface TokenUsageQueryArgs extends MonitoringHookArgs {
	options?: MonitoringQueryOptions<TokenUsageRecord[]>;
}

export interface JobsQueryArgs extends MonitoringHookArgs {
	options?: MonitoringQueryOptions<JobRecord[]>;
}

export interface AgentsQueryArgs extends MonitoringHookArgs {
	options?: MonitoringQueryOptions<AgentRecord[]>;
}

export interface SkillsQueryArgs extends MonitoringHookArgs {
	options?: MonitoringQueryOptions<SkillRecord[]>;
}

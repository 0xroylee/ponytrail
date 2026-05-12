import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import type {
	AgentsQueryArgs,
	JobsQueryArgs,
	SkillsQueryArgs,
	TokenUsageQueryArgs,
} from "./monitoring-hooks.types";
import { monitoringQueryKeys } from "./monitoring-query-keys";
import type {
	AgentRecord,
	JobRecord,
	SkillRecord,
	TokenUsageRecord,
} from "./monitoring.types";

export function useTokenUsageQuery({
	client,
	options,
}: TokenUsageQueryArgs): UseQueryResult<TokenUsageRecord[], Error> {
	return useQuery({
		queryKey: monitoringQueryKeys.tokenUsage,
		queryFn: () => client.listTokenUsage(),
		initialData: [],
		...options,
	});
}

export function useJobsQuery({
	client,
	options,
}: JobsQueryArgs): UseQueryResult<JobRecord[], Error> {
	return useQuery({
		queryKey: monitoringQueryKeys.jobs,
		queryFn: () => client.listJobs(),
		initialData: [],
		...options,
	});
}

export function useAgentsQuery({
	client,
	options,
}: AgentsQueryArgs): UseQueryResult<AgentRecord[], Error> {
	return useQuery({
		queryKey: monitoringQueryKeys.agents,
		queryFn: () => client.listAgents(),
		initialData: [],
		...options,
	});
}

export function useSkillsQuery({
	client,
	options,
}: SkillsQueryArgs): UseQueryResult<SkillRecord[], Error> {
	return useQuery({
		queryKey: monitoringQueryKeys.skills,
		queryFn: () => client.listSkills(),
		initialData: [],
		...options,
	});
}

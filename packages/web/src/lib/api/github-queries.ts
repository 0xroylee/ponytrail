"use client";

import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { serverStateQueryKeys } from "./query-keys";
import type { GitHubRepositorySearchResult } from "./types/client.types";
import type { ServerStateQueryOptions } from "./types/queries.types";
import { createWebApiClient } from "./web-client";

const apiClient = createWebApiClient();

export function useGitHubRepositorySearchQuery(
	query: string,
	options?: ServerStateQueryOptions,
): UseQueryResult<GitHubRepositorySearchResult[], Error> {
	const trimmed = query.trim();
	return useQuery({
		queryKey: serverStateQueryKeys.githubRepositorySearch(trimmed),
		queryFn: () => apiClient.searchGitHubRepositories(trimmed),
		enabled: trimmed.length >= 2 && options?.enabled !== false,
		refetchInterval: false,
	});
}

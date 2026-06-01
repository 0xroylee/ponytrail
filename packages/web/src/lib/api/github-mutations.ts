"use client";

import {
	type UseMutationResult,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { serverStateQueryKeys } from "./query-keys";
import type {
	GitHubConnectionResponse,
	GitHubDeviceStartRequest,
	GitHubDeviceStartResponse,
	GitHubRepositoriesResponse,
} from "./types/client.types";
import { createWebApiClient } from "./web-client";

const apiClient = createWebApiClient();

const disconnectedRepositories: GitHubRepositoriesResponse = {
	isAvailable: false,
	repositories: [],
	unavailableReason: "Connect GitHub to list repositories",
};

export function useDisconnectGitHubMutation(): UseMutationResult<
	GitHubConnectionResponse,
	Error,
	void
> {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => apiClient.disconnectGitHub(),
		onSuccess: (connection) => {
			queryClient.setQueryData(
				serverStateQueryKeys.gitHubConnection,
				connection,
			);
			queryClient.setQueryData(
				serverStateQueryKeys.gitHubRepositories,
				disconnectedRepositories,
			);
			queryClient.invalidateQueries({
				queryKey: serverStateQueryKeys.gitHubConnection,
			});
			queryClient.invalidateQueries({
				queryKey: serverStateQueryKeys.gitHubRepositories,
			});
		},
	});
}

export function useStartGitHubDeviceFlowMutation(): UseMutationResult<
	GitHubDeviceStartResponse,
	Error,
	GitHubDeviceStartRequest
> {
	return useMutation({
		mutationFn: (request) => apiClient.startGitHubDeviceFlow(request),
	});
}

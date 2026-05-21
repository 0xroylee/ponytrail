"use client";

import {
	type QueryClient,
	type UseMutationResult,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import type { WorkspaceProjectRecord } from "./client.types";
import type { ProjectCreateMutationInput } from "./queries.types";
import { serverStateQueryKeys } from "./query-keys";
import { createWebApiClient } from "./web-client";

const apiClient = createWebApiClient();

export function useCreateProjectMutation(): UseMutationResult<
	WorkspaceProjectRecord,
	Error,
	ProjectCreateMutationInput
> {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ["project", "create"] as const,
		mutationFn: (input) => apiClient.createProject(input),
		onSuccess: (project) => refreshCreatedProjectCache(queryClient, project),
	});
}

export async function refreshCreatedProjectCache(
	queryClient: Pick<QueryClient, "setQueryData" | "invalidateQueries">,
	project: WorkspaceProjectRecord,
): Promise<void> {
	queryClient.setQueryData<WorkspaceProjectRecord[] | undefined>(
		serverStateQueryKeys.workspaceProjects(project.workspaceId),
		(current) => (current ? [...current, project] : [project]),
	);
	await queryClient.invalidateQueries({
		queryKey: serverStateQueryKeys.workspaceProjects(project.workspaceId),
	});
}

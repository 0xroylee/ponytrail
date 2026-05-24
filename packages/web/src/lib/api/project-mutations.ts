"use client";

import {
	type QueryClient,
	type UseMutationResult,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { serverStateQueryKeys } from "./query-keys";
import type { WorkspaceProjectRecord } from "./types/client.types";
import type { ProjectCreateMutationInput } from "./types/queries.types";
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

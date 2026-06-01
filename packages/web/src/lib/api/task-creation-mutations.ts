"use client";

import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import type { TaskCreateResponse } from "./types/client.types";
import type { TaskCreateMutationInput } from "./types/queries.types";
import { createWebApiClient } from "./web-client";

const apiClient = createWebApiClient();

export const taskCreationMutationKeys = {
	createTask: ["task-creation", "create-task"] as const,
};

export function useCreateTaskMutation(): UseMutationResult<
	TaskCreateResponse,
	Error,
	TaskCreateMutationInput
> {
	return useMutation({
		mutationKey: taskCreationMutationKeys.createTask,
		mutationFn: (input) =>
			apiClient.createTask({
				request: input.request,
				projectId: input.projectId || undefined,
				answers: input.answers,
			}),
	});
}

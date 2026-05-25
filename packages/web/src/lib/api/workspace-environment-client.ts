import {
	assertObjectRecord,
	readBoolean,
	readNullableString,
	readNumber,
	readString,
} from "./response-utils";
import type { HealthRequestOptions } from "./types/client.types";
import type {
	WorkspaceEnvironmentGitStatus,
	WorkspaceEnvironmentMcpSource,
	WorkspaceEnvironmentResponse,
} from "./types/workspace-environment.types";

const WORKSPACE_ENVIRONMENT_PATH = "/api/workspace/environment";

type RequestWithBase = (
	path: string,
	method: "GET" | "POST" | "PATCH" | "DELETE",
	options?: HealthRequestOptions,
	body?: unknown,
) => Promise<unknown>;

export interface WorkspaceEnvironmentApiMethods {
	getWorkspaceEnvironment(
		projectId?: string,
		options?: HealthRequestOptions,
	): Promise<WorkspaceEnvironmentResponse>;
}

export function createWorkspaceEnvironmentApiMethods(
	requestWithBase: RequestWithBase,
): WorkspaceEnvironmentApiMethods {
	return {
		async getWorkspaceEnvironment(projectId, options) {
			const path = projectId
				? `${WORKSPACE_ENVIRONMENT_PATH}?projectId=${encodeURIComponent(
						projectId,
					)}`
				: WORKSPACE_ENVIRONMENT_PATH;
			const payload = await requestWithBase(path, "GET", options);
			return parseWorkspaceEnvironmentResponse(payload);
		},
	};
}

export function parseWorkspaceEnvironmentResponse(
	payload: unknown,
): WorkspaceEnvironmentResponse {
	const row = assertObjectRecord(payload, WORKSPACE_ENVIRONMENT_PATH);
	return {
		workspaceId: readString(row, "workspaceId", WORKSPACE_ENVIRONMENT_PATH),
		projectId: readNullableString(row, "projectId", WORKSPACE_ENVIRONMENT_PATH),
		folder: readString(row, "folder", WORKSPACE_ENVIRONMENT_PATH),
		git: parseGitStatus(row.git),
		mcps: parseMcpSources(row.mcps),
	};
}

function parseGitStatus(payload: unknown): WorkspaceEnvironmentGitStatus {
	const row = assertObjectRecord(payload, `${WORKSPACE_ENVIRONMENT_PATH}.git`);
	return {
		available: readBoolean(row, "available", WORKSPACE_ENVIRONMENT_PATH),
		branch: readNullableString(row, "branch", WORKSPACE_ENVIRONMENT_PATH),
		dirty: readBoolean(row, "dirty", WORKSPACE_ENVIRONMENT_PATH),
		added: readNumber(row, "added", WORKSPACE_ENVIRONMENT_PATH),
		deleted: readNumber(row, "deleted", WORKSPACE_ENVIRONMENT_PATH),
		untracked: readNumber(row, "untracked", WORKSPACE_ENVIRONMENT_PATH),
		reason: readNullableString(row, "reason", WORKSPACE_ENVIRONMENT_PATH),
	};
}

function parseMcpSources(payload: unknown): WorkspaceEnvironmentMcpSource[] {
	if (!Array.isArray(payload)) {
		throw new Error(
			`Invalid ${WORKSPACE_ENVIRONMENT_PATH} response field 'mcps'`,
		);
	}
	return payload.map(parseMcpSource);
}

function parseMcpSource(payload: unknown): WorkspaceEnvironmentMcpSource {
	const row = assertObjectRecord(payload, `${WORKSPACE_ENVIRONMENT_PATH}.mcps`);
	return {
		id: readString(row, "id", WORKSPACE_ENVIRONMENT_PATH),
		label: readString(row, "label", WORKSPACE_ENVIRONMENT_PATH),
		available: readBoolean(row, "available", WORKSPACE_ENVIRONMENT_PATH),
		detail: readNullableString(row, "detail", WORKSPACE_ENVIRONMENT_PATH),
	};
}

import {
	assertObjectRecord,
	parseListResponse,
	readBoolean,
	readNullableNumber,
	readNullableString,
	readNumber,
	readString,
} from "./response-utils";
import type {
	GitHubApiMethods,
	GitHubConnectionResponse,
	GitHubDevicePollResponse,
	GitHubDeviceStartResponse,
	GitHubRepositoriesResponse,
	GitHubRepositoryRecord,
	HealthRequestOptions,
} from "./types/client.types";

const GITHUB_CONNECTION_PATH = "/api/github/connection";
const GITHUB_DEVICE_START_PATH = "/api/github/device/start";
const GITHUB_DEVICE_POLL_PATH = "/api/github/device/poll";
const GITHUB_REPOSITORIES_PATH = "/api/github/repositories";

function parseGitHubRepositoryRecord(payload: unknown): GitHubRepositoryRecord {
	const endpoint = GITHUB_REPOSITORIES_PATH;
	const row = assertObjectRecord(payload, endpoint);
	return {
		id: readString(row, "id", endpoint),
		owner: readString(row, "owner", endpoint),
		name: readString(row, "name", endpoint),
		nameWithOwner: readString(row, "nameWithOwner", endpoint),
		defaultBranch: readNullableString(row, "defaultBranch", endpoint),
		isPrivate: readBoolean(row, "isPrivate", endpoint),
	};
}

export function parseGitHubRepositoriesResponse(
	payload: unknown,
): GitHubRepositoriesResponse {
	const endpoint = GITHUB_REPOSITORIES_PATH;
	const row = assertObjectRecord(payload, endpoint);
	return {
		isAvailable: readBoolean(row, "isAvailable", endpoint),
		unavailableReason: readNullableString(row, "unavailableReason", endpoint),
		repositories: parseListResponse(
			row.repositories,
			`${endpoint}:repositories`,
			parseGitHubRepositoryRecord,
		),
	};
}

export function parseGitHubConnectionResponse(
	payload: unknown,
): GitHubConnectionResponse {
	const endpoint = GITHUB_CONNECTION_PATH;
	const row = assertObjectRecord(payload, endpoint);
	return {
		isConfigured: readBoolean(row, "isConfigured", endpoint),
		isConnected: readBoolean(row, "isConnected", endpoint),
		login: readNullableString(row, "login", endpoint),
		unavailableReason: readNullableString(row, "unavailableReason", endpoint),
	};
}

export function parseGitHubDeviceStartResponse(
	payload: unknown,
): GitHubDeviceStartResponse {
	const endpoint = GITHUB_DEVICE_START_PATH;
	const row = assertObjectRecord(payload, endpoint);
	return {
		userCode: readString(row, "userCode", endpoint),
		verificationUri: readString(row, "verificationUri", endpoint),
		expiresIn: readNumber(row, "expiresIn", endpoint),
		interval: readNumber(row, "interval", endpoint),
	};
}

export function parseGitHubDevicePollResponse(
	payload: unknown,
): GitHubDevicePollResponse {
	const endpoint = GITHUB_DEVICE_POLL_PATH;
	const row = assertObjectRecord(payload, endpoint);
	const connection = row.connection;
	return {
		status: readGitHubDeviceStatus(row, endpoint),
		interval: readNullableNumber(row, "interval", endpoint),
		connection:
			connection === null ? null : parseGitHubConnectionResponse(connection),
		message: readNullableString(row, "message", endpoint),
	};
}

function readGitHubDeviceStatus(
	row: Record<string, unknown>,
	endpoint: string,
): GitHubDevicePollResponse["status"] {
	const status = readString(row, "status", endpoint);
	if (
		status === "pending" ||
		status === "slow_down" ||
		status === "expired" ||
		status === "denied" ||
		status === "connected" ||
		status === "error"
	) {
		return status;
	}
	throw new Error(`Invalid ${endpoint} response field 'status'`);
}

export function createGitHubApiMethods(
	requestWithBase: (
		path: string,
		method: "GET" | "POST" | "PATCH" | "DELETE",
		options?: HealthRequestOptions,
		body?: unknown,
	) => Promise<unknown>,
): GitHubApiMethods {
	return {
		async getGitHubConnection(options) {
			const payload = await requestWithBase(
				GITHUB_CONNECTION_PATH,
				"GET",
				options,
			);
			return parseGitHubConnectionResponse(payload);
		},
		async disconnectGitHub(options) {
			const payload = await requestWithBase(
				GITHUB_CONNECTION_PATH,
				"DELETE",
				options,
			);
			return parseGitHubConnectionResponse(payload);
		},
		async listGitHubRepositories(options) {
			const payload = await requestWithBase(
				GITHUB_REPOSITORIES_PATH,
				"GET",
				options,
			);
			return parseGitHubRepositoriesResponse(payload);
		},
		async startGitHubDeviceFlow(request, options) {
			const payload = await requestWithBase(
				GITHUB_DEVICE_START_PATH,
				"POST",
				options,
				request,
			);
			return parseGitHubDeviceStartResponse(payload);
		},
		async pollGitHubDeviceFlow(options) {
			const payload = await requestWithBase(
				GITHUB_DEVICE_POLL_PATH,
				"POST",
				options,
			);
			return parseGitHubDevicePollResponse(payload);
		},
	};
}

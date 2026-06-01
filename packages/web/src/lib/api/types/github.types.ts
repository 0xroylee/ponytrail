import type { HealthRequestOptions } from "./health.types";

export interface GitHubConnectionResponse {
	isConfigured: boolean;
	isConnected: boolean;
	login: string | null;
	unavailableReason: string | null;
}

export interface GitHubDeviceStartRequest {
	clientId?: string | null;
}

export interface GitHubDeviceStartResponse {
	userCode: string;
	verificationUri: string;
	expiresIn: number;
	interval: number;
}

export type GitHubDevicePollStatus =
	| "pending"
	| "slow_down"
	| "expired"
	| "denied"
	| "connected"
	| "error";

export interface GitHubDevicePollResponse {
	status: GitHubDevicePollStatus;
	interval: number | null;
	connection: GitHubConnectionResponse | null;
	message: string | null;
}

export interface GitHubRepositoryRecord {
	id: string;
	owner: string;
	name: string;
	nameWithOwner: string;
	defaultBranch: string | null;
	isPrivate: boolean;
}

export interface GitHubRepositoriesResponse {
	isAvailable: boolean;
	unavailableReason: string | null;
	repositories: GitHubRepositoryRecord[];
}

export interface GitHubApiMethods {
	listGitHubRepositories(
		options?: HealthRequestOptions,
	): Promise<GitHubRepositoriesResponse>;
	getGitHubConnection(
		options?: HealthRequestOptions,
	): Promise<GitHubConnectionResponse>;
	disconnectGitHub(
		options?: HealthRequestOptions,
	): Promise<GitHubConnectionResponse>;
	startGitHubDeviceFlow(
		request: GitHubDeviceStartRequest,
		options?: HealthRequestOptions,
	): Promise<GitHubDeviceStartResponse>;
	pollGitHubDeviceFlow(
		options?: HealthRequestOptions,
	): Promise<GitHubDevicePollResponse>;
}

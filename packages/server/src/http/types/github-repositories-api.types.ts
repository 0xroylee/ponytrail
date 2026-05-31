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

export interface GitHubConnectionResponse {
	isConfigured: boolean;
	isConnected: boolean;
	login: string | null;
	unavailableReason: string | null;
}

export interface GitHubRepositoriesRouteDeps {
	env?: Record<string, string | undefined>;
	fetchFn?: typeof fetch;
	loadEnv?: (cwd: string) => Promise<Record<string, string> | undefined>;
	randomState?: () => string;
	saveEnv?: (
		cwd: string,
		updates: Record<string, string | undefined>,
	) => Promise<void>;
}

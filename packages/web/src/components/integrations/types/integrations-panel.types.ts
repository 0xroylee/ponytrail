import type { GitHubConnectionResponse } from "@/lib/api/types/client.types";

export interface GitHubIntegrationStateInput {
	connection: GitHubConnectionResponse | undefined;
	isConnectionError?: boolean;
	isConnectionLoading?: boolean;
	isRepositoryError?: boolean;
	isRepositoryLoading?: boolean;
	repositoryCount: number;
	repositoryUnavailableReason?: string | null;
}

export interface GitHubIntegrationState {
	canConnect: boolean;
	canDisconnect: boolean;
	detail: string;
	needsClientId: boolean;
	repositorySummary: string;
	statusLabel: string;
}

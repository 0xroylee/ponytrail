import type {
	GitHubIntegrationState,
	GitHubIntegrationStateInput,
} from "./types/integrations-panel.types";

export function buildGitHubIntegrationState({
	connection,
	isConnectionError = false,
	isConnectionLoading = false,
	isRepositoryError = false,
	isRepositoryLoading = false,
	repositoryCount,
	repositoryUnavailableReason,
}: GitHubIntegrationStateInput): GitHubIntegrationState {
	if (isConnectionError) {
		return state(
			"Unavailable",
			false,
			false,
			false,
			"Connection unavailable",
			"Repositories unavailable",
		);
	}
	if (isConnectionLoading || !connection) {
		return state(
			"Checking",
			false,
			false,
			false,
			"Connection loading",
			"Repositories",
		);
	}
	if (!connection.isConfigured) {
		return state(
			"Setup needed",
			true,
			false,
			true,
			connection.unavailableReason ?? "OAuth client missing",
			"Repositories unavailable",
		);
	}
	if (!connection.isConnected) {
		return state(
			"Disconnected",
			true,
			false,
			false,
			connection.unavailableReason ?? "No account connected",
			"Repositories unavailable",
		);
	}
	return state(
		"Connected",
		false,
		true,
		false,
		connection.login ?? "GitHub account",
		repositoryLabel(
			repositoryCount,
			isRepositoryLoading,
			isRepositoryError,
			repositoryUnavailableReason,
		),
	);
}

function repositoryLabel(
	count: number,
	isLoading: boolean,
	isError: boolean,
	unavailableReason: string | null | undefined,
): string {
	if (isLoading) return "Checking repositories";
	if (isError) return "Repositories unavailable";
	if (unavailableReason) return unavailableReason;
	return `${count} ${count === 1 ? "repository" : "repositories"} available`;
}

function state(
	statusLabel: string,
	canConnect: boolean,
	canDisconnect: boolean,
	needsClientId: boolean,
	detail: string,
	repositorySummary: string,
): GitHubIntegrationState {
	return {
		canConnect,
		canDisconnect,
		detail,
		needsClientId,
		repositorySummary,
		statusLabel,
	};
}

import { describe, expect, it } from "bun:test";
import { buildGitHubIntegrationState } from "../src/components/integrations/integrations-panel-utils";

describe("integrations panel utils", () => {
	it("prompts for a GitHub client id when device flow is not configured", () => {
		expect(
			buildGitHubIntegrationState({
				connection: {
					isConfigured: false,
					isConnected: false,
					login: null,
					unavailableReason: "GitHub OAuth is not configured",
				},
				repositoryCount: 0,
			}),
		).toMatchObject({
			statusLabel: "Setup needed",
			canConnect: true,
			canDisconnect: false,
			needsClientId: true,
		});
	});

	it("shows connected account and repository count", () => {
		expect(
			buildGitHubIntegrationState({
				connection: {
					isConfigured: true,
					isConnected: true,
					login: "octo",
					unavailableReason: null,
				},
				repositoryCount: 12,
			}),
		).toMatchObject({
			statusLabel: "Connected",
			detail: "octo",
			repositorySummary: "12 repositories available",
			canConnect: false,
			canDisconnect: true,
		});
	});

	it("allows connect when configured but disconnected", () => {
		expect(
			buildGitHubIntegrationState({
				connection: {
					isConfigured: true,
					isConnected: false,
					login: null,
					unavailableReason: "Connect GitHub to list repositories",
				},
				repositoryCount: 0,
			}),
		).toMatchObject({
			statusLabel: "Disconnected",
			canConnect: true,
			canDisconnect: false,
			needsClientId: false,
		});
	});

	it("shows unavailable when the connection request fails without cached data", () => {
		expect(
			buildGitHubIntegrationState({
				connection: undefined,
				isConnectionError: true,
				repositoryCount: 0,
			}),
		).toMatchObject({
			statusLabel: "Unavailable",
			canConnect: false,
			canDisconnect: false,
		});
	});
});

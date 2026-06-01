import type { GitHubConnectionResponse } from "./types/github-repositories-api.types";

export const CLIENT_ID_KEY = "GITHUB_OAUTH_CLIENT_ID";
export const CLIENT_SECRET_KEY = "GITHUB_OAUTH_CLIENT_SECRET";
export const TOKEN_KEY = "GITHUB_OAUTH_ACCESS_TOKEN";
export const LOGIN_KEY = "GITHUB_OAUTH_LOGIN";

const OAUTH_UNCONFIGURED = "GitHub OAuth is not configured";
const OAUTH_DISCONNECTED = "Connect GitHub to list repositories";

export type DeviceConfig = { clientId: string };
export type OAuthConfig = DeviceConfig & { clientSecret: string };
export type StoredConnection = { login: string | null; token: string | null };

export function readDeviceConfig(
	env: Record<string, string | undefined>,
	store?: Record<string, string> | undefined,
): DeviceConfig | null {
	const clientId = value(env[CLIENT_ID_KEY]) ?? value(store?.[CLIENT_ID_KEY]);
	return clientId ? { clientId } : null;
}

export function readOAuthConfig(
	env: Record<string, string | undefined>,
	store?: Record<string, string> | undefined,
): OAuthConfig | null {
	const clientId = value(env[CLIENT_ID_KEY]) ?? value(store?.[CLIENT_ID_KEY]);
	const clientSecret =
		value(env[CLIENT_SECRET_KEY]) ?? value(store?.[CLIENT_SECRET_KEY]);
	return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function readStoredConnection(
	store: Record<string, string> | undefined,
): StoredConnection {
	return { login: value(store?.[LOGIN_KEY]), token: value(store?.[TOKEN_KEY]) };
}

export function connectionResponse(
	config: DeviceConfig | OAuthConfig | null,
	store: StoredConnection,
): GitHubConnectionResponse {
	if (store.login && store.token)
		return connection(true, true, store.login, null);
	if (!config) return connection(false, false, null, OAUTH_UNCONFIGURED);
	return connection(true, false, null, OAUTH_DISCONNECTED);
}

export function githubHeaders(token: string): Record<string, string> {
	return {
		accept: "application/vnd.github+json",
		authorization: `Bearer ${token}`,
	};
}

export function value(input: unknown): string | null {
	return typeof input === "string" && input.trim() ? input.trim() : null;
}

function connection(
	isConfigured: boolean,
	isConnected: boolean,
	login: string | null,
	unavailableReason: string | null,
): GitHubConnectionResponse {
	return { isConfigured, isConnected, login, unavailableReason };
}

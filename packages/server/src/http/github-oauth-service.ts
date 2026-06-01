import { loadSqliteEnv, saveSqliteEnv } from "devos/features/config";
import {
	LOGIN_KEY,
	type OAuthConfig,
	TOKEN_KEY,
	connectionResponse,
	githubHeaders,
	readDeviceConfig,
	readOAuthConfig,
	readStoredConnection,
	value,
} from "./github-oauth-config";
import {
	STATE_COOKIE,
	createGitHubOAuthRedirectContext,
	oauthRedirect,
	readCookie,
	readStoredGitHubOAuthRedirectContext,
	redirect,
	startRedirectCookies,
} from "./github-oauth-redirects";
import { badRequest } from "./http-utils";
import type {
	GitHubConnectionResponse,
	GitHubRepositoriesRouteDeps,
} from "./types/github-repositories-api.types";

type RouteDeps = Required<Omit<GitHubRepositoriesRouteDeps, "env">> & {
	env: Record<string, string | undefined>;
};

export async function getGitHubConnection(
	workspacePath: string,
	deps: GitHubRepositoriesRouteDeps,
): Promise<GitHubConnectionResponse> {
	const resolved = resolveDeps(deps);
	const store = await resolved.loadEnv(workspacePath);
	return connectionResponse(
		readDeviceConfig(resolved.env, store),
		readStoredConnection(store),
	);
}

export async function disconnectGitHub(
	workspacePath: string,
	deps: GitHubRepositoriesRouteDeps,
): Promise<GitHubConnectionResponse> {
	const resolved = resolveDeps(deps);
	const store = await resolved.loadEnv(workspacePath);
	await resolved.saveEnv(workspacePath, {
		[TOKEN_KEY]: undefined,
		[LOGIN_KEY]: undefined,
	});
	return connectionResponse(readDeviceConfig(resolved.env, store), {
		login: null,
		token: null,
	});
}

export function startGitHubOAuth(
	request: Request,
	deps: GitHubRepositoriesRouteDeps,
): Response {
	const resolved = resolveDeps(deps);
	const config = readOAuthConfig(resolved.env);
	if (!config) {
		return Response.json(
			connectionResponse(null, { login: null, token: null }),
			{ status: 503 },
		);
	}
	const state = resolved.randomState();
	const redirectContext = createGitHubOAuthRedirectContext(request);
	const location = new URL("https://github.com/login/oauth/authorize");
	location.searchParams.set("client_id", config.clientId);
	location.searchParams.set("redirect_uri", redirectContext.callbackUrl);
	location.searchParams.set("scope", "repo");
	location.searchParams.set("state", state);
	return redirect(
		location.toString(),
		startRedirectCookies(state, redirectContext),
	);
}

export async function finishGitHubOAuth(
	request: Request,
	workspacePath: string,
	deps: GitHubRepositoriesRouteDeps,
): Promise<Response> {
	const url = new URL(request.url);
	const code = value(url.searchParams.get("code"));
	const state = value(url.searchParams.get("state"));
	if (!code || !state || readCookie(request, STATE_COOKIE) !== state) {
		return badRequest("Invalid GitHub OAuth callback");
	}
	const resolved = resolveDeps(deps);
	const config = readOAuthConfig(resolved.env);
	if (!config) return oauthRedirect(request, "error");
	try {
		const redirectContext = readStoredGitHubOAuthRedirectContext(request);
		const token = await exchangeCode(
			resolved.fetchFn,
			config,
			code,
			redirectContext.callbackUrl,
		);
		const login = await fetchLogin(resolved.fetchFn, token);
		await resolved.saveEnv(workspacePath, {
			[TOKEN_KEY]: token,
			[LOGIN_KEY]: login,
		});
		return oauthRedirect(request, "connected");
	} catch {
		return oauthRedirect(request, "error");
	}
}

async function exchangeCode(
	fetchFn: typeof fetch,
	config: OAuthConfig,
	code: string,
	redirectUri: string,
): Promise<string> {
	const payload = await fetchJson(
		fetchFn,
		"https://github.com/login/oauth/access_token",
		{
			method: "POST",
			headers: {
				accept: "application/json",
				"content-type": "application/json",
			},
			body: JSON.stringify({
				client_id: config.clientId,
				client_secret: config.clientSecret,
				code,
				redirect_uri: redirectUri,
			}),
		},
	);
	const token = value((payload as Record<string, unknown>).access_token);
	if (!token) throw new Error("GitHub token exchange failed");
	return token;
}

async function fetchLogin(
	fetchFn: typeof fetch,
	token: string,
): Promise<string> {
	const payload = await fetchJson(fetchFn, "https://api.github.com/user", {
		headers: githubHeaders(token),
	});
	const login = value((payload as Record<string, unknown>).login);
	if (!login) throw new Error("GitHub user fetch failed");
	return login;
}

async function fetchJson(
	fetchFn: typeof fetch,
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<unknown> {
	const response = await fetchFn(input, init);
	if (!response.ok) throw new Error("GitHub request failed");
	return response.json();
}

function resolveDeps(deps: GitHubRepositoriesRouteDeps): RouteDeps {
	return {
		env: deps.env ?? process.env,
		fetchFn: deps.fetchFn ?? fetch,
		loadEnv: deps.loadEnv ?? loadSqliteEnv,
		randomState: deps.randomState ?? crypto.randomUUID,
		saveEnv: deps.saveEnv ?? saveSqliteEnv,
	};
}

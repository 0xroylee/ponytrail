import { loadSqliteEnv, saveSqliteEnv } from "devos/features/config";
import { badRequest, methodNotAllowed } from "./http-utils";
import type {
	GitHubConnectionResponse,
	GitHubRepositoriesResponse,
	GitHubRepositoriesRouteDeps,
	GitHubRepositoryRecord,
} from "./types/github-repositories-api.types";

const CONNECTION_PATH = "/api/github/connection";
const OAUTH_START_PATH = "/api/github/oauth/start";
const OAUTH_CALLBACK_PATH = "/api/github/oauth/callback";
const REPOSITORIES_PATH = "/api/github/repositories";
const CLIENT_ID_KEY = "GITHUB_OAUTH_CLIENT_ID";
const CLIENT_SECRET_KEY = "GITHUB_OAUTH_CLIENT_SECRET";
const TOKEN_KEY = "GITHUB_OAUTH_ACCESS_TOKEN";
const LOGIN_KEY = "GITHUB_OAUTH_LOGIN";
const STATE_COOKIE = "devos_github_oauth_state";
const REPOS_URL =
	"https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member";
const REPOS_UNAVAILABLE = "GitHub repositories unavailable";
const OAUTH_UNCONFIGURED = "GitHub OAuth is not configured";
const OAUTH_DISCONNECTED = "Connect GitHub to list repositories";
const KNOWN_PATHS = new Set([
	CONNECTION_PATH,
	OAUTH_START_PATH,
	OAUTH_CALLBACK_PATH,
	REPOSITORIES_PATH,
]);

type RouteDeps = Required<Omit<GitHubRepositoriesRouteDeps, "env">> & {
	env: Record<string, string | undefined>;
};
type OAuthConfig = { clientId: string; clientSecret: string };

export async function handleGitHubRepositoriesRoute(
	request: Request,
	pathname: string,
	workspacePath: string,
	deps: GitHubRepositoriesRouteDeps = {},
): Promise<Response | null> {
	if (!KNOWN_PATHS.has(pathname)) return null;
	const routeDeps = resolveDeps(deps);
	if (pathname === CONNECTION_PATH) {
		return handleConnection(request, workspacePath, routeDeps);
	}
	if (request.method !== "GET") return methodNotAllowed();
	if (pathname === OAUTH_START_PATH) return startOAuth(request, routeDeps);
	if (pathname === OAUTH_CALLBACK_PATH) {
		return finishOAuth(request, workspacePath, routeDeps);
	}
	return listRepositories(workspacePath, routeDeps);
}

async function handleConnection(
	request: Request,
	workspacePath: string,
	deps: RouteDeps,
): Promise<Response> {
	if (request.method === "GET") {
		const store = await deps.loadEnv(workspacePath);
		return Response.json(connectionResponse(readConfig(deps.env), store));
	}
	if (request.method !== "DELETE") return methodNotAllowed();
	await deps.saveEnv(workspacePath, {
		[TOKEN_KEY]: undefined,
		[LOGIN_KEY]: undefined,
	});
	return Response.json(connectionResponse(readConfig(deps.env), undefined));
}

function startOAuth(request: Request, deps: RouteDeps): Response {
	const config = readConfig(deps.env);
	if (!config) {
		return Response.json(connectionResponse(null, undefined), { status: 503 });
	}
	const state = deps.randomState();
	const redirectUri = new URL(OAUTH_CALLBACK_PATH, request.url);
	const location = new URL("https://github.com/login/oauth/authorize");
	location.searchParams.set("client_id", config.clientId);
	location.searchParams.set("redirect_uri", redirectUri.toString());
	location.searchParams.set("scope", "repo");
	location.searchParams.set("state", state);
	return redirect(location.toString(), stateCookie(state, 600));
}

async function finishOAuth(
	request: Request,
	workspacePath: string,
	deps: RouteDeps,
): Promise<Response> {
	const url = new URL(request.url);
	const code = value(url.searchParams.get("code"));
	const state = value(url.searchParams.get("state"));
	if (!code || !state || readCookie(request, STATE_COOKIE) !== state) {
		return badRequest("Invalid GitHub OAuth callback");
	}
	const config = readConfig(deps.env);
	if (!config) return oauthRedirect(request, "error");
	try {
		const token = await exchangeCode(deps.fetchFn, config, code, request.url);
		const login = await fetchLogin(deps.fetchFn, token);
		await deps.saveEnv(workspacePath, {
			[TOKEN_KEY]: token,
			[LOGIN_KEY]: login,
		});
		return oauthRedirect(request, "connected");
	} catch {
		return oauthRedirect(request, "error");
	}
}

async function listRepositories(
	workspacePath: string,
	deps: RouteDeps,
): Promise<Response> {
	const config = readConfig(deps.env);
	const store = await deps.loadEnv(workspacePath);
	const token = value(store?.[TOKEN_KEY]);
	if (!config) return Response.json(repositoryUnavailable(OAUTH_UNCONFIGURED));
	if (!token) return Response.json(repositoryUnavailable(OAUTH_DISCONNECTED));
	try {
		const payload = await fetchJson(deps.fetchFn, REPOS_URL, {
			headers: githubHeaders(token),
		});
		if (!Array.isArray(payload)) {
			return Response.json(repositoryUnavailable(REPOS_UNAVAILABLE));
		}
		return Response.json({
			isAvailable: true,
			unavailableReason: null,
			repositories: payload.flatMap(parseRepository),
		} satisfies GitHubRepositoriesResponse);
	} catch {
		return Response.json(repositoryUnavailable(REPOS_UNAVAILABLE));
	}
}

async function exchangeCode(
	fetchFn: typeof fetch,
	config: OAuthConfig,
	code: string,
	requestUrl: string,
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
				redirect_uri: new URL(OAUTH_CALLBACK_PATH, requestUrl).toString(),
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

function parseRepository(value: unknown): GitHubRepositoryRecord[] {
	if (typeof value !== "object" || value === null) return [];
	const repo = value as Record<string, unknown> & {
		owner?: { login?: unknown } | null;
	};
	if (
		typeof repo.owner?.login !== "string" ||
		typeof repo.name !== "string" ||
		typeof repo.full_name !== "string" ||
		(repo.id !== undefined && typeof repo.id !== "number")
	) {
		return [];
	}
	return [
		{
			id: typeof repo.id === "number" ? String(repo.id) : repo.full_name,
			owner: repo.owner.login,
			name: repo.name,
			nameWithOwner: repo.full_name,
			defaultBranch:
				typeof repo.default_branch === "string" ? repo.default_branch : null,
			isPrivate: repo.private === true,
		},
	];
}

function connectionResponse(
	config: OAuthConfig | null,
	store: Record<string, string> | undefined,
): GitHubConnectionResponse {
	const login = value(store?.[LOGIN_KEY]);
	const token = value(store?.[TOKEN_KEY]);
	if (!config) return connection(false, false, null, OAUTH_UNCONFIGURED);
	if (!login || !token)
		return connection(true, false, null, OAUTH_DISCONNECTED);
	return connection(true, true, login, null);
}

function connection(
	isConfigured: boolean,
	isConnected: boolean,
	login: string | null,
	unavailableReason: string | null,
): GitHubConnectionResponse {
	return { isConfigured, isConnected, login, unavailableReason };
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

function readConfig(
	env: Record<string, string | undefined>,
): OAuthConfig | null {
	const clientId = value(env[CLIENT_ID_KEY]);
	const clientSecret = value(env[CLIENT_SECRET_KEY]);
	return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function repositoryUnavailable(reason: string): GitHubRepositoriesResponse {
	return { isAvailable: false, unavailableReason: reason, repositories: [] };
}

function githubHeaders(token: string): Record<string, string> {
	return {
		accept: "application/vnd.github+json",
		authorization: `Bearer ${token}`,
	};
}

function value(input: unknown): string | null {
	return typeof input === "string" && input.trim() ? input.trim() : null;
}

function readCookie(request: Request, name: string): string | null {
	const encoded = request.headers
		.get("cookie")
		?.split(";")
		.map((cookie) => cookie.trim())
		.find((cookie) => cookie.startsWith(`${name}=`))
		?.slice(name.length + 1);
	return encoded ? decodeURIComponent(encoded) : null;
}

function stateCookie(state: string, maxAge: number): string {
	return `${STATE_COOKIE}=${encodeURIComponent(state)}; HttpOnly; SameSite=Lax; Path=/api/github/oauth; Max-Age=${maxAge}`;
}

function clearStateCookie(): string {
	return `${STATE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/api/github/oauth; Max-Age=0`;
}

function oauthRedirect(
	request: Request,
	result: "connected" | "error",
): Response {
	return redirect(
		new URL(`/projects?github=${result}`, request.url).toString(),
		clearStateCookie(),
	);
}

function redirect(location: string, cookie: string): Response {
	return new Response(null, {
		status: 302,
		headers: { location, "set-cookie": cookie },
	});
}

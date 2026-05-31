import { describe, expect, it } from "bun:test";
import { handleGitHubRepositoriesRoute } from "../src/http/github-repositories-routes";
import type { GitHubRepositoriesRouteDeps } from "../src/http/types/github-repositories-api.types";

type FetchCall = { input: URL | RequestInfo; init?: RequestInit };

const CONNECTED_STORE = {
	GITHUB_OAUTH_ACCESS_TOKEN: "token-123",
	GITHUB_OAUTH_LOGIN: "octo",
};

function connection(
	isConfigured: boolean,
	isConnected: boolean,
	login: string | null,
	unavailableReason: string | null,
) {
	return { isConfigured, isConnected, login, unavailableReason };
}

const unavailable = (unavailableReason: string) => ({
	isAvailable: false,
	unavailableReason,
	repositories: [],
});

function createRouteDeps(options?: {
	env?: Record<string, string>;
	initialStore?: Record<string, string>;
	fetchFn?: typeof fetch;
}) {
	const store = { ...(options?.initialStore ?? {}) };
	const saves: Array<Record<string, string | undefined>> = [];
	const fetchCalls: FetchCall[] = [];
	const fetchFn = (async (input, init) => {
		fetchCalls.push({ input, init });
		return (
			options?.fetchFn?.(input, init) ?? new Response("{}", { status: 500 })
		);
	}) as typeof fetch;
	const deps: GitHubRepositoriesRouteDeps = {
		env: options?.env ?? {
			GITHUB_OAUTH_CLIENT_ID: "client-id",
			GITHUB_OAUTH_CLIENT_SECRET: "client-secret",
		},
		fetchFn,
		loadEnv: async () => ({ ...store }),
		randomState: () => "state-123",
		saveEnv: async (_cwd, updates) => {
			saves.push(updates);
			for (const [key, value] of Object.entries(updates)) {
				if (value === undefined) {
					delete store[key];
					continue;
				}
				store[key] = value;
			}
		},
	};
	return { deps, fetchCalls, saves, store };
}

async function route(
	pathname: string,
	deps: GitHubRepositoriesRouteDeps,
	init?: RequestInit,
) {
	return handleGitHubRepositoriesRoute(
		new Request(`http://localhost${pathname}`, init),
		pathname.split("?")[0] ?? pathname,
		"/workspace",
		deps,
	);
}

describe("GitHub repositories route", () => {
	it("reports GitHub connection states", async () => {
		const unconfigured = await route(
			"/api/github/connection",
			createRouteDeps({ env: {} }).deps,
		);
		expect(await unconfigured?.json()).toEqual(
			connection(false, false, null, "GitHub OAuth is not configured"),
		);

		const disconnected = await route(
			"/api/github/connection",
			createRouteDeps().deps,
		);
		expect(await disconnected?.json()).toEqual(
			connection(true, false, null, "Connect GitHub to list repositories"),
		);

		const connected = await route(
			"/api/github/connection",
			createRouteDeps({ initialStore: CONNECTED_STORE }).deps,
		);
		expect(await connected?.json()).toEqual(
			connection(true, true, "octo", null),
		);
	});

	it("redirects OAuth start requests to GitHub with a state cookie", async () => {
		const response = await route(
			"/api/github/oauth/start",
			createRouteDeps().deps,
		);
		const location = new URL(response?.headers.get("location") ?? "");

		expect(response?.status).toBe(302);
		expect(location.origin + location.pathname).toBe(
			"https://github.com/login/oauth/authorize",
		);
		expect(location.searchParams.get("client_id")).toBe("client-id");
		expect(location.searchParams.get("redirect_uri")).toBe(
			"http://localhost/api/github/oauth/callback",
		);
		expect(location.searchParams.get("scope")).toBe("repo");
		expect(location.searchParams.get("state")).toBe("state-123");
		expect(response?.headers.get("set-cookie")).toContain(
			"devos_github_oauth_state=state-123; HttpOnly; SameSite=Lax; Path=/api/github/oauth; Max-Age=600",
		);
	});

	it("exchanges OAuth callback codes, saves token/login, and redirects", async () => {
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			const url = String(input);
			if (url === "https://github.com/login/oauth/access_token") {
				expect(init?.method).toBe("POST");
				return Response.json({ access_token: "token-123" });
			}
			if (url === "https://api.github.com/user") {
				expect((init?.headers as Record<string, string>).authorization).toBe(
					"Bearer token-123",
				);
				return Response.json({ login: "octo" });
			}
			return new Response("{}", { status: 404 });
		}) as typeof fetch;
		const { deps, saves } = createRouteDeps({ fetchFn });

		const response = await route(
			"/api/github/oauth/callback?code=code-123&state=state-123",
			deps,
			{ headers: { cookie: "devos_github_oauth_state=state-123" } },
		);

		expect(response?.status).toBe(302);
		expect(response?.headers.get("location")).toBe(
			"http://localhost/projects?github=connected",
		);
		expect(response?.headers.get("set-cookie")).toContain("Max-Age=0");
		expect(saves).toEqual([
			{
				GITHUB_OAUTH_ACCESS_TOKEN: "token-123",
				GITHUB_OAUTH_LOGIN: "octo",
			},
		]);
	});

	it("rejects OAuth callbacks with invalid state without saving", async () => {
		const { deps, saves } = createRouteDeps();
		const response = await route(
			"/api/github/oauth/callback?code=code-123&state=state-123",
			deps,
			{ headers: { cookie: "devos_github_oauth_state=wrong-state" } },
		);

		expect(response?.status).toBe(400);
		expect(await response?.json()).toEqual({
			error: "Invalid GitHub OAuth callback",
		});
		expect(saves).toEqual([]);
	});

	it("clears stored token and login on disconnect", async () => {
		const { deps, saves } = createRouteDeps({ initialStore: CONNECTED_STORE });

		const response = await route("/api/github/connection", deps, {
			method: "DELETE",
		});

		expect(await response?.json()).toEqual(
			connection(true, false, null, "Connect GitHub to list repositories"),
		);
		expect(saves).toEqual([
			{
				GITHUB_OAUTH_ACCESS_TOKEN: undefined,
				GITHUB_OAUTH_LOGIN: undefined,
			},
		]);
	});

	it("lists repositories from GitHub REST with a stored token", async () => {
		const { deps, fetchCalls } = createRouteDeps({
			initialStore: { GITHUB_OAUTH_ACCESS_TOKEN: "token-123" },
			fetchFn: (async () =>
				Response.json([
					{
						id: 42,
						name: "core",
						full_name: "octo/core",
						default_branch: "trunk",
						private: true,
						owner: { login: "octo" },
					},
				])) as unknown as typeof fetch,
		});

		const response = await route("/api/github/repositories", deps);

		expect(String(fetchCalls[0]?.input)).toBe(
			"https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
		);
		expect(await response?.json()).toEqual({
			isAvailable: true,
			unavailableReason: null,
			repositories: [
				{
					id: "42",
					owner: "octo",
					name: "core",
					nameWithOwner: "octo/core",
					defaultBranch: "trunk",
					isPrivate: true,
				},
			],
		});
	});

	it("returns unavailable repository responses for disconnected or bad REST states", async () => {
		const cases = [
			{
				deps: createRouteDeps({ env: {} }).deps,
				reason: "GitHub OAuth is not configured",
			},
			{
				deps: createRouteDeps().deps,
				reason: "Connect GitHub to list repositories",
			},
			{
				deps: createRouteDeps({
					initialStore: { GITHUB_OAUTH_ACCESS_TOKEN: "token-123" },
					fetchFn: (async () =>
						new Response("nope", { status: 500 })) as unknown as typeof fetch,
				}).deps,
				reason: "GitHub repositories unavailable",
			},
			{
				deps: createRouteDeps({
					initialStore: { GITHUB_OAUTH_ACCESS_TOKEN: "token-123" },
					fetchFn: (async () =>
						Response.json({ bad: true })) as unknown as typeof fetch,
				}).deps,
				reason: "GitHub repositories unavailable",
			},
		];

		for (const item of cases) {
			const response = await route("/api/github/repositories", item.deps);
			expect(await response?.json()).toEqual(unavailable(item.reason));
		}
	});

	it("returns method not allowed for known paths with unsupported methods", async () => {
		for (const pathname of [
			"/api/github/connection",
			"/api/github/oauth/start",
			"/api/github/oauth/callback",
			"/api/github/repositories",
		]) {
			const response = await route(pathname, createRouteDeps().deps, {
				method: "POST",
			});
			expect(response?.status).toBe(405);
		}
		expect(
			await route("/api/github/not-here", createRouteDeps().deps),
		).toBeNull();
	});
});

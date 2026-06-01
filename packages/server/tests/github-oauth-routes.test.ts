import { describe, expect, it } from "bun:test";
import { handleGitHubRepositoriesRoute } from "../src/http/github-repositories-routes";
import type { GitHubRepositoriesRouteDeps } from "../src/http/types/github-repositories-api.types";

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

function createRouteDeps(options?: {
	env?: Record<string, string>;
	initialStore?: Record<string, string>;
	fetchFn?: typeof fetch;
}) {
	const store = { ...(options?.initialStore ?? {}) };
	const saves: Array<Record<string, string | undefined>> = [];
	const fetchFn = (async (input, init) =>
		options?.fetchFn?.(input, init) ??
		new Response("{}", { status: 500 })) as typeof fetch;
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
	return { deps, saves };
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

describe("GitHub OAuth routes", () => {
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
			"/api/github/oauth/start?returnTo=/integrations&origin=http://localhost:3100",
			createRouteDeps().deps,
		);
		const location = new URL(response?.headers.get("location") ?? "");

		expect(response?.status).toBe(302);
		expect(location.origin + location.pathname).toBe(
			"https://github.com/login/oauth/authorize",
		);
		expect(location.searchParams.get("client_id")).toBe("client-id");
		expect(location.searchParams.get("redirect_uri")).toBe(
			"http://127.0.0.1:3100/api/github/oauth/callback",
		);
		expect(location.searchParams.get("scope")).toBe("repo");
		expect(location.searchParams.get("state")).toBe("state-123");
		const cookie = response?.headers.get("set-cookie") ?? "";
		expect(cookie).toContain(
			"devos_github_oauth_state=state-123; HttpOnly; SameSite=Lax; Path=/api/github/oauth; Max-Age=600",
		);
		expect(cookie).toContain(
			"devos_github_oauth_return_to=%2Fintegrations; HttpOnly; SameSite=Lax; Path=/api/github/oauth; Max-Age=600",
		);
		expect(cookie).toContain(
			"devos_github_oauth_origin=http%3A%2F%2F127.0.0.1%3A3100; HttpOnly; SameSite=Lax; Path=/api/github/oauth; Max-Age=600",
		);
	});

	it("exchanges OAuth callback codes, saves token/login, and redirects", async () => {
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			if (String(input) === "https://github.com/login/oauth/access_token") {
				expect(init?.method).toBe("POST");
				expect(JSON.parse(String(init?.body))).toMatchObject({
					redirect_uri: "http://127.0.0.1:3100/api/github/oauth/callback",
				});
				return Response.json({ access_token: "token-123" });
			}
			expect((init?.headers as Record<string, string>).authorization).toBe(
				"Bearer token-123",
			);
			return Response.json({ login: "octo" });
		}) as typeof fetch;
		const { deps, saves } = createRouteDeps({ fetchFn });

		const response = await route(
			"/api/github/oauth/callback?code=code-123&state=state-123",
			deps,
			{
				headers: {
					cookie:
						"devos_github_oauth_state=state-123; devos_github_oauth_return_to=%2Fintegrations; devos_github_oauth_origin=http%3A%2F%2F127.0.0.1%3A3100",
				},
			},
		);

		expect(response?.status).toBe(302);
		expect(response?.headers.get("location")).toBe(
			"http://127.0.0.1:3100/integrations?github=connected",
		);
		expect(response?.headers.get("set-cookie")).toContain("Max-Age=0");
		expect(saves).toEqual([
			{
				GITHUB_OAUTH_ACCESS_TOKEN: "token-123",
				GITHUB_OAUTH_LOGIN: "octo",
			},
		]);
	});

	it("falls back to projects for unsafe OAuth return targets", async () => {
		const response = await route(
			"/api/github/oauth/start?returnTo=https://evil.example/callback&origin=https://evil.example",
			createRouteDeps().deps,
		);
		const location = new URL(response?.headers.get("location") ?? "");

		expect(location.searchParams.get("redirect_uri")).toBe(
			"http://localhost/api/github/oauth/callback",
		);
		expect(response?.headers.get("set-cookie")).toContain(
			"devos_github_oauth_return_to=%2Fprojects",
		);
	});

	it("starts device flow with a client id and no client secret", async () => {
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			expect(String(input)).toBe("https://github.com/login/device/code");
			expect(init?.method).toBe("POST");
			expect(JSON.parse(String(init?.body))).toEqual({
				client_id: "device-client-id",
				scope: "repo",
			});
			return Response.json({
				device_code: "device-code-123",
				user_code: "WDJB-MJHT",
				verification_uri: "https://github.com/login/device",
				expires_in: 900,
				interval: 5,
			});
		}) as typeof fetch;
		const { deps, saves } = createRouteDeps({ env: {}, fetchFn });

		const response = await route("/api/github/device/start", deps, {
			method: "POST",
			body: JSON.stringify({ clientId: "device-client-id" }),
		});

		expect(response?.status).toBe(200);
		expect(await response?.json()).toEqual({
			userCode: "WDJB-MJHT",
			verificationUri: "https://github.com/login/device",
			expiresIn: 900,
			interval: 5,
		});
		expect(response?.headers.get("set-cookie")).toContain(
			"devos_github_device_code=device-code-123; HttpOnly; SameSite=Lax; Path=/api/github/device; Max-Age=900",
		);
		expect(saves).toEqual([{ GITHUB_OAUTH_CLIENT_ID: "device-client-id" }]);
	});

	it("polls a pending device flow without saving a token", async () => {
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			expect(String(input)).toBe("https://github.com/login/oauth/access_token");
			expect(init?.method).toBe("POST");
			expect(JSON.parse(String(init?.body))).toEqual({
				client_id: "client-id",
				device_code: "device-code-123",
				grant_type: "urn:ietf:params:oauth:grant-type:device_code",
			});
			return Response.json({ error: "authorization_pending" });
		}) as typeof fetch;
		const { deps, saves } = createRouteDeps({ fetchFn });

		const response = await route("/api/github/device/poll", deps, {
			method: "POST",
			headers: { cookie: "devos_github_device_code=device-code-123" },
		});

		expect(response?.status).toBe(200);
		expect(await response?.json()).toEqual({
			status: "pending",
			interval: 5,
			connection: null,
			message: "Waiting for GitHub authorization",
		});
		expect(saves).toEqual([]);
	});

	it("polls an authorized device flow, saves the account, and clears the device cookie", async () => {
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			if (String(input) === "https://github.com/login/oauth/access_token") {
				expect(JSON.parse(String(init?.body))).not.toHaveProperty(
					"client_secret",
				);
				return Response.json({ access_token: "token-123" });
			}
			expect(String(input)).toBe("https://api.github.com/user");
			expect((init?.headers as Record<string, string>).authorization).toBe(
				"Bearer token-123",
			);
			return Response.json({ login: "octo" });
		}) as typeof fetch;
		const { deps, saves } = createRouteDeps({ fetchFn });

		const response = await route("/api/github/device/poll", deps, {
			method: "POST",
			headers: { cookie: "devos_github_device_code=device-code-123" },
		});

		expect(response?.status).toBe(200);
		expect(await response?.json()).toEqual({
			status: "connected",
			interval: null,
			connection: connection(true, true, "octo", null),
			message: null,
		});
		expect(response?.headers.get("set-cookie")).toContain(
			"devos_github_device_code=; HttpOnly; SameSite=Lax; Path=/api/github/device; Max-Age=0",
		);
		expect(saves).toEqual([
			{
				GITHUB_OAUTH_ACCESS_TOKEN: "token-123",
				GITHUB_OAUTH_LOGIN: "octo",
			},
		]);
	});

	it("rejects invalid callback state without saving", async () => {
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

	it("keeps a stored device-flow client id configured after disconnect", async () => {
		const { deps, saves } = createRouteDeps({
			env: {},
			initialStore: {
				...CONNECTED_STORE,
				GITHUB_OAUTH_CLIENT_ID: "device-client-id",
			},
		});
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

	it("returns method not allowed for known OAuth paths", async () => {
		for (const pathname of [
			"/api/github/connection",
			"/api/github/oauth/start",
			"/api/github/oauth/callback",
		]) {
			const response = await route(pathname, createRouteDeps().deps, {
				method: "POST",
			});
			expect(response?.status).toBe(405);
		}
	});
});

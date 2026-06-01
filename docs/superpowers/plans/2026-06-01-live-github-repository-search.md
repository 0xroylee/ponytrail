# Live GitHub Repository Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-backed live GitHub repository search to project create/edit so operators can find repositories by name and save `repoOwner`, `repoName`, and `baseBranch`.

**Architecture:** Put GitHub lookup behind a small server boundary and expose it with `GET /api/github/repositories/search?q=...`. Add typed web API/query plumbing, then refactor the Projects UI into a reusable create/edit form with a repository picker. Keep workflow execution, project routing, database schema, and CLI GitHub PR automation unchanged.

**Tech Stack:** Bun, TypeScript, React 19, Next.js, React Query, Tailwind, Bun test, existing server route registry and web API client patterns.

---

## File Structure

- Create: `packages/server/src/github/types/github-repository-search.types.ts`
  - Owns server-side GitHub repository search request/result/service result contracts.
- Create: `packages/server/src/github/github-repository-search.ts`
  - Owns query validation, GitHub API request construction, response parsing, and stable service status mapping.
- Create: `packages/server/src/github/index.ts`
  - Narrow public export for the server HTTP route.
- Create: `packages/server/src/http/github-routes.ts`
  - Owns `/api/github/repositories/search` request handling and HTTP status mapping.
- Modify: `packages/server/src/http/app-routes.ts`
  - Registers the GitHub route.
- Create: `packages/server/tests/github-repository-search.test.ts`
  - Unit tests service mapping without a running app.
- Create: `packages/server/tests/github-routes.test.ts`
  - Route tests for success, validation, auth, upstream failures, and method handling.
- Create: `packages/web/src/lib/api/github-client.ts`
  - Owns web response parsing and path building for repository search.
- Modify: `packages/web/src/lib/api/types/client.types.ts`
  - Adds repository search request/result types and `ApiClient.searchGitHubRepositories`.
- Modify: `packages/web/src/lib/api/client.ts`
  - Wires `github-client` into the shared API client.
- Modify: `packages/web/src/lib/api/query-keys.ts`
  - Adds a repository search query key.
- Modify: `packages/web/src/lib/api/queries.ts`
  - Adds `useGitHubRepositorySearchQuery`.
- Modify: `packages/web/src/lib/api/board-client.ts`
  - Adds `updateProject`.
- Modify: `packages/web/src/lib/api/project-mutations.ts`
  - Adds update mutation and cache refresh helper.
- Create: `packages/web/src/components/projects/project-repository-picker.tsx`
  - Owns the repository input, result list, loading/error states, and selection callback.
- Rename/replace: `packages/web/src/components/projects/project-create-dialog.tsx`
  - Convert to `project-form-dialog.tsx` for create and edit.
- Modify: `packages/web/src/components/projects/projects-panel-utils.ts`
  - Adds repository field parsing, selected-result mapping, create/update request builders, and edit form hydration.
- Modify: `packages/web/src/components/projects/types/projects-panel.types.ts`
  - Adds repository search form state and create/edit dialog types.
- Modify: `packages/web/src/components/projects/projects-table.tsx`
  - Adds a compact edit action per row.
- Create: `packages/web/src/components/projects/projects-toolbar.tsx`
  - Moves table search/density controls out of `projects-panel.tsx` so both
    files stay under the repository TypeScript line limit.
- Modify: `packages/web/src/components/projects/projects-panel.tsx`
  - Reduces orchestration to state and mutation wiring, keeping the file below 250 lines.
- Modify: `packages/web/tests/project-client.test.ts`
  - Covers search and update API client behavior.
- Modify: `packages/web/tests/project-mutations.test.ts`
  - Covers update cache refresh.
- Modify: `packages/web/tests/projects-panel-utils.test.ts`
  - Covers repository parsing, selected-result mapping, and edit hydration.

## Task 1: Server GitHub Repository Search Boundary

**Files:**
- Create: `packages/server/src/github/types/github-repository-search.types.ts`
- Create: `packages/server/src/github/github-repository-search.ts`
- Create: `packages/server/src/github/index.ts`
- Test: `packages/server/tests/github-repository-search.test.ts`

- [ ] **Step 1: Write the failing service tests**

Create `packages/server/tests/github-repository-search.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { searchGitHubRepositories } from "../src/github";

function jsonResponse(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("GitHub repository search service", () => {
	it("maps GitHub repository search results into stable records", async () => {
		const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
			expect(String(input)).toBe(
				"https://api.github.com/search/repositories?q=show-me-ur-agents&per_page=8",
			);
			expect(init?.headers).toBeInstanceOf(Headers);
			expect((init?.headers as Headers).get("accept")).toBe(
				"application/vnd.github+json",
			);
			return jsonResponse({
				items: [
					{
						id: 7,
						owner: { login: "devos" },
						name: "show-me-ur-agents",
						full_name: "devos/show-me-ur-agents",
						html_url: "https://github.com/devos/show-me-ur-agents",
						clone_url: "https://github.com/devos/show-me-ur-agents.git",
						default_branch: "main",
						description: "Agent workflow UI",
						private: false,
					},
				],
			});
		}) as typeof fetch;

		const result = await searchGitHubRepositories({
			query: " show-me-ur-agents ",
			fetchFn,
		});

		expect(result).toEqual({
			status: "ok",
			repositories: [
				{
					id: "7",
					owner: "devos",
					name: "show-me-ur-agents",
					fullName: "devos/show-me-ur-agents",
					htmlUrl: "https://github.com/devos/show-me-ur-agents",
					cloneUrl: "https://github.com/devos/show-me-ur-agents.git",
					defaultBranch: "main",
					description: "Agent workflow UI",
					isPrivate: false,
				},
			],
		});
	});

	it("returns stable statuses for validation, auth, rate limit, and upstream failures", async () => {
		expect(await searchGitHubRepositories({ query: " " })).toEqual({
			status: "invalid_query",
		});

		const unauthorizedFetch = (async () =>
			jsonResponse({ message: "Bad credentials" }, 401)) as typeof fetch;
		expect(
			await searchGitHubRepositories({
				query: "repo",
				fetchFn: unauthorizedFetch,
			}),
		).toEqual({ status: "auth_unavailable" });

		const rateLimitedFetch = (async () =>
			jsonResponse({ message: "rate limited" }, 403)) as typeof fetch;
		expect(
			await searchGitHubRepositories({
				query: "repo",
				fetchFn: rateLimitedFetch,
			}),
		).toEqual({ status: "rate_limited" });

		const failingFetch = (async () => {
			throw new Error("network down");
		}) as typeof fetch;
		expect(
			await searchGitHubRepositories({
				query: "repo",
				fetchFn: failingFetch,
			}),
		).toEqual({ status: "upstream_error" });
	});
});
```

- [ ] **Step 2: Run the service tests to verify RED**

Run:

```bash
rtk bun test packages/server/tests/github-repository-search.test.ts
```

Expected: FAIL because `../src/github` does not exist.

- [ ] **Step 3: Add the service contracts**

Create `packages/server/src/github/types/github-repository-search.types.ts`:

```ts
export interface GitHubRepositorySearchResult {
	id: string;
	owner: string;
	name: string;
	fullName: string;
	htmlUrl: string;
	cloneUrl: string;
	defaultBranch: string;
	description: string | null;
	isPrivate: boolean;
}

export interface GitHubRepositorySearchInput {
	query: string;
	fetchFn?: typeof fetch;
	token?: string | null;
	limit?: number;
}

export type GitHubRepositorySearchServiceResult =
	| { status: "ok"; repositories: GitHubRepositorySearchResult[] }
	| { status: "invalid_query" }
	| { status: "auth_unavailable" }
	| { status: "rate_limited" }
	| { status: "upstream_error" };
```

- [ ] **Step 4: Add the minimal service implementation**

Create `packages/server/src/github/github-repository-search.ts`:

```ts
import type {
	GitHubRepositorySearchInput,
	GitHubRepositorySearchResult,
	GitHubRepositorySearchServiceResult,
} from "./types/github-repository-search.types";

const GITHUB_SEARCH_URL = "https://api.github.com/search/repositories";
const DEFAULT_LIMIT = 8;

export async function searchGitHubRepositories(
	input: GitHubRepositorySearchInput,
): Promise<GitHubRepositorySearchServiceResult> {
	const query = input.query.trim();
	if (!query) {
		return { status: "invalid_query" };
	}
	const fetchFn = input.fetchFn ?? fetch;
	const requestUrl = new URL(GITHUB_SEARCH_URL);
	requestUrl.searchParams.set("q", query);
	requestUrl.searchParams.set("per_page", String(input.limit ?? DEFAULT_LIMIT));

	const headers = new Headers({
		accept: "application/vnd.github+json",
		"user-agent": "devos-ing",
	});
	const token = input.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
	if (token) {
		headers.set("authorization", `Bearer ${token}`);
	}

	try {
		const response = await fetchFn(requestUrl.toString(), { headers });
		if (response.status === 401 || response.status === 404) {
			return { status: "auth_unavailable" };
		}
		if (response.status === 403 || response.status === 429) {
			return { status: "rate_limited" };
		}
		if (!response.ok) {
			return { status: "upstream_error" };
		}
		const payload = (await response.json()) as unknown;
		return {
			status: "ok",
			repositories: parseSearchPayload(payload),
		};
	} catch {
		return { status: "upstream_error" };
	}
}

function parseSearchPayload(payload: unknown): GitHubRepositorySearchResult[] {
	if (!isRecord(payload) || !Array.isArray(payload.items)) {
		return [];
	}
	return payload.items.flatMap((item) => {
		const parsed = parseRepositoryItem(item);
		return parsed ? [parsed] : [];
	});
}

function parseRepositoryItem(
	item: unknown,
): GitHubRepositorySearchResult | null {
	if (!isRecord(item) || !isRecord(item.owner)) {
		return null;
	}
	const id = item.id;
	const owner = item.owner.login;
	const name = item.name;
	const fullName = item.full_name;
	const htmlUrl = item.html_url;
	const cloneUrl = item.clone_url;
	const defaultBranch = item.default_branch;
	const description = item.description;
	const isPrivate = item.private;
	if (
		typeof owner !== "string" ||
		typeof name !== "string" ||
		typeof fullName !== "string" ||
		typeof htmlUrl !== "string" ||
		typeof cloneUrl !== "string" ||
		typeof defaultBranch !== "string" ||
		typeof isPrivate !== "boolean"
	) {
		return null;
	}
	return {
		id: String(id),
		owner,
		name,
		fullName,
		htmlUrl,
		cloneUrl,
		defaultBranch,
		description: typeof description === "string" ? description : null,
		isPrivate,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
```

Create `packages/server/src/github/index.ts`:

```ts
export { searchGitHubRepositories } from "./github-repository-search";
export type {
	GitHubRepositorySearchInput,
	GitHubRepositorySearchResult,
	GitHubRepositorySearchServiceResult,
} from "./types/github-repository-search.types";
```

- [ ] **Step 5: Run the service tests to verify GREEN**

Run:

```bash
rtk bun test packages/server/tests/github-repository-search.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
rtk git add packages/server/src/github packages/server/tests/github-repository-search.test.ts
rtk git commit -m "Add GitHub repository search service"
```

## Task 2: Server Search Route

**Files:**
- Create: `packages/server/src/http/github-routes.ts`
- Modify: `packages/server/src/http/app-routes.ts`
- Test: `packages/server/tests/github-routes.test.ts`

- [ ] **Step 1: Write the failing route tests**

Create `packages/server/tests/github-routes.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { createHandleRequest } from "../src/app";

function jsonResponse(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("GitHub repository search route", () => {
	it("returns normalized repository search results", async () => {
		const app = createHandleRequest(createDeps());

		const response = await app(
			new Request(
				"http://localhost/api/github/repositories/search?q=show-me-ur-agents",
			),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			repositories: [
				{
					id: "7",
					owner: "devos",
					name: "show-me-ur-agents",
					fullName: "devos/show-me-ur-agents",
					htmlUrl: "https://github.com/devos/show-me-ur-agents",
					cloneUrl: "https://github.com/devos/show-me-ur-agents.git",
					defaultBranch: "main",
					description: "Agent workflow UI",
					isPrivate: false,
				},
			],
		});
	});

	it("maps validation, auth, rate-limit, upstream, and method errors", async () => {
		const app = createHandleRequest(createDeps());

		const invalid = await app(
			new Request("http://localhost/api/github/repositories/search?q=%20"),
		);
		expect(invalid.status).toBe(400);
		expect(await invalid.json()).toEqual({ error: "Repository query is required" });

		const auth = await app(
			new Request("http://localhost/api/github/repositories/search?q=auth"),
		);
		expect(auth.status).toBe(503);
		expect(await auth.json()).toEqual({
			error: "GitHub repository search is not authenticated",
		});

		const limited = await app(
			new Request("http://localhost/api/github/repositories/search?q=limit"),
		);
		expect(limited.status).toBe(429);
		expect(await limited.json()).toEqual({
			error: "GitHub repository search is rate limited",
		});

		const upstream = await app(
			new Request("http://localhost/api/github/repositories/search?q=upstream"),
		);
		expect(upstream.status).toBe(502);
		expect(await upstream.json()).toEqual({
			error: "GitHub repository search is unavailable",
		});

		const post = await app(
			new Request("http://localhost/api/github/repositories/search?q=repo", {
				method: "POST",
			}),
		);
		expect(post.status).toBe(405);
	});
});

function createDeps() {
	const fetchFn = (async (input: URL | RequestInfo) => {
		const url = new URL(String(input));
		const query = url.searchParams.get("q");
		if (query === "auth") return jsonResponse({ message: "Bad credentials" }, 401);
		if (query === "limit") return jsonResponse({ message: "limited" }, 429);
		if (query === "upstream") return jsonResponse({ message: "down" }, 500);
		return jsonResponse({
			items: [
				{
					id: 7,
					owner: { login: "devos" },
					name: "show-me-ur-agents",
					full_name: "devos/show-me-ur-agents",
					html_url: "https://github.com/devos/show-me-ur-agents",
					clone_url: "https://github.com/devos/show-me-ur-agents.git",
					default_branch: "main",
					description: "Agent workflow UI",
					private: false,
				},
			],
		});
	}) as typeof fetch;

	return {
		githubRepositorySearchFetch: fetchFn,
		cliExecutor: {
			execute: async () => ({
				status: "succeeded" as const,
				request: { action: "none" as const },
			}),
			executeStream: async () => ({
				status: "succeeded" as const,
				request: { action: "none" as const },
			}),
			getHistory: () => [],
		},
	};
}
```

- [ ] **Step 2: Run route tests to verify RED**

Run:

```bash
rtk bun test packages/server/tests/github-routes.test.ts
```

Expected: FAIL because the route returns 404 and `githubRepositorySearchFetch` is not in `AppDeps`.

- [ ] **Step 3: Add the optional route dependency type**

Modify `packages/server/src/types/app.types.ts` by adding this optional field to `AppDeps`:

```ts
githubRepositorySearchFetch?: typeof fetch;
```

- [ ] **Step 4: Implement the route**

Create `packages/server/src/http/github-routes.ts`:

```ts
import { searchGitHubRepositories } from "../github";
import {
	badRequestResponse,
	jsonError,
	jsonSuccess,
	methodNotAllowedResponse,
} from "./response";

export async function handleGitHubRoute(
	request: Request,
	pathname: string,
	fetchFn?: typeof fetch,
): Promise<Response | null> {
	if (pathname !== "/api/github/repositories/search") {
		return null;
	}
	if (request.method !== "GET") {
		return methodNotAllowedResponse();
	}
	const query = new URL(request.url).searchParams.get("q") ?? "";
	const result = await searchGitHubRepositories({ query, fetchFn });
	if (result.status === "ok") {
		return jsonSuccess({ repositories: result.repositories });
	}
	if (result.status === "invalid_query") {
		return badRequestResponse("Repository query is required");
	}
	if (result.status === "auth_unavailable") {
		return jsonError("GitHub repository search is not authenticated", {
			status: 503,
		});
	}
	if (result.status === "rate_limited") {
		return jsonError("GitHub repository search is rate limited", { status: 429 });
	}
	return jsonError("GitHub repository search is unavailable", { status: 502 });
}
```

- [ ] **Step 5: Register the route**

Modify `packages/server/src/http/app-routes.ts`:

```ts
import { handleGitHubRoute } from "./github-routes";
```

Add the route after workspace-current and before DB-backed routes:

```ts
route("github", (request, { pathname }) =>
	handleGitHubRoute(request, pathname, deps.githubRepositorySearchFetch),
),
```

- [ ] **Step 6: Run route tests to verify GREEN**

Run:

```bash
rtk bun test packages/server/tests/github-routes.test.ts packages/server/tests/app-routes.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

Run:

```bash
rtk git add packages/server/src/http/github-routes.ts packages/server/src/http/app-routes.ts packages/server/src/types/app.types.ts packages/server/tests/github-routes.test.ts
rtk git commit -m "Expose GitHub repository search route"
```

## Task 3: Web API Client And Query Plumbing

**Files:**
- Create: `packages/web/src/lib/api/github-client.ts`
- Modify: `packages/web/src/lib/api/types/client.types.ts`
- Modify: `packages/web/src/lib/api/client.ts`
- Modify: `packages/web/src/lib/api/query-keys.ts`
- Modify: `packages/web/src/lib/api/queries.ts`
- Modify: `packages/web/src/lib/api/board-client.ts`
- Modify: `packages/web/src/lib/api/project-mutations.ts`
- Test: `packages/web/tests/project-client.test.ts`
- Test: `packages/web/tests/project-mutations.test.ts`

- [ ] **Step 1: Write failing web client and mutation tests**

Append to `packages/web/tests/project-client.test.ts`:

```ts
it("searches GitHub repositories through the server API", async () => {
	const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
		expect(String(input)).toBe(
			"/api/github/repositories/search?q=show-me-ur-agents",
		);
		expect(init?.method).toBe("GET");
		return okJsonResponse({
			repositories: [
				{
					id: "7",
					owner: "devos",
					name: "show-me-ur-agents",
					fullName: "devos/show-me-ur-agents",
					htmlUrl: "https://github.com/devos/show-me-ur-agents",
					cloneUrl: "https://github.com/devos/show-me-ur-agents.git",
					defaultBranch: "main",
					description: "Agent workflow UI",
					isPrivate: false,
				},
			],
		});
	}) as typeof fetch;
	const client = createApiClient({ fetchFn });

	await expect(
		client.searchGitHubRepositories(" show-me-ur-agents "),
	).resolves.toEqual([
		{
			id: "7",
			owner: "devos",
			name: "show-me-ur-agents",
			fullName: "devos/show-me-ur-agents",
			htmlUrl: "https://github.com/devos/show-me-ur-agents",
			cloneUrl: "https://github.com/devos/show-me-ur-agents.git",
			defaultBranch: "main",
			description: "Agent workflow UI",
			isPrivate: false,
		},
	]);
});

it("updates projects through the server API", async () => {
	const fetchFn = (async (input: URL | RequestInfo, init?: RequestInit) => {
		expect(String(input)).toBe("/api/projects/project-1");
		expect(init?.method).toBe("PATCH");
		expect(JSON.parse(String(init?.body))).toEqual({
			name: "Updated",
			repoOwner: "devos",
			repoName: "show-me-ur-agents",
			baseBranch: "main",
		});
		return okJsonResponse({
			id: "project-1",
			boardId: "board-1",
			ownerId: "owner-1",
			name: "Updated",
			externalProjectId: null,
			description: null,
			repoOwner: "devos",
			repoName: "show-me-ur-agents",
			baseBranch: "main",
			localFolder: null,
			lead: null,
			category: null,
			priority: null,
			createdAt: "2026-05-20T00:00:00.000Z",
			updatedAt: "2026-05-21T00:00:00.000Z",
		});
	}) as typeof fetch;
	const client = createApiClient({ fetchFn });

	const project = await client.updateProject("project-1", {
		name: "Updated",
		repoOwner: "devos",
		repoName: "show-me-ur-agents",
		baseBranch: "main",
	});

	expect(project.name).toBe("Updated");
	expect(project.repoOwner).toBe("devos");
});
```

Append to `packages/web/tests/project-mutations.test.ts`:

```ts
import { refreshUpdatedProjectCache } from "../src/lib/api/project-mutations";

it("replaces an updated project and invalidates affected project caches", async () => {
	const queryClient = new QueryClient();
	const existing = projectRecord("project-existing", "Existing");
	const updated = projectRecord("project-existing", "Updated");
	const listKey = serverStateQueryKeys.workspaceProjects(updated.workspaceId);
	const boardKey = serverStateQueryKeys.projectBoard(
		updated.workspaceId,
		updated.id,
	);
	queryClient.setQueryData(listKey, [existing]);
	queryClient.setQueryData(boardKey, { project: existing, statusColumns: [] });

	await refreshUpdatedProjectCache(queryClient, updated);

	expect(queryClient.getQueryData(listKey)).toEqual([updated]);
	expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
	expect(queryClient.getQueryState(boardKey)?.isInvalidated).toBe(true);
	queryClient.clear();
});
```

- [ ] **Step 2: Run web tests to verify RED**

Run:

```bash
rtk bun test packages/web/tests/project-client.test.ts packages/web/tests/project-mutations.test.ts
```

Expected: FAIL because search/update client methods and `refreshUpdatedProjectCache` do not exist.

- [ ] **Step 3: Add client types**

Modify `packages/web/src/lib/api/types/client.types.ts`:

```ts
export interface GitHubRepositorySearchResult {
	id: string;
	owner: string;
	name: string;
	fullName: string;
	htmlUrl: string;
	cloneUrl: string;
	defaultBranch: string;
	description: string | null;
	isPrivate: boolean;
}

export interface GitHubRepositorySearchResponse {
	repositories: GitHubRepositorySearchResult[];
}

export interface ProjectUpdateRequest {
	boardId?: string;
	ownerId?: string;
	name?: string;
	externalProjectId?: string | null;
	description?: string | null;
	repoOwner?: string | null;
	repoName?: string | null;
	baseBranch?: string | null;
	localFolder?: string | null;
	lead?: string | null;
	category?: string | null;
	priority?: number | null;
}
```

Add to `ApiClient`:

```ts
searchGitHubRepositories(
	query: string,
	options?: HealthRequestOptions,
): Promise<GitHubRepositorySearchResult[]>;
updateProject(
	projectId: string,
	request: ProjectUpdateRequest,
	options?: HealthRequestOptions,
): Promise<WorkspaceProjectRecord>;
```

- [ ] **Step 4: Add GitHub client methods**

Create `packages/web/src/lib/api/github-client.ts`:

```ts
import {
	assertObjectRecord,
	parseListResponse,
	readBoolean,
	readNullableString,
	readString,
} from "./response-utils";
import type {
	GitHubRepositorySearchResponse,
	GitHubRepositorySearchResult,
	HealthRequestOptions,
} from "./types/client.types";

const ENDPOINT = "/api/github/repositories/search";

export function parseGitHubRepositorySearchResult(
	payload: unknown,
): GitHubRepositorySearchResult {
	const row = assertObjectRecord(payload, ENDPOINT);
	return {
		id: readString(row, "id", ENDPOINT),
		owner: readString(row, "owner", ENDPOINT),
		name: readString(row, "name", ENDPOINT),
		fullName: readString(row, "fullName", ENDPOINT),
		htmlUrl: readString(row, "htmlUrl", ENDPOINT),
		cloneUrl: readString(row, "cloneUrl", ENDPOINT),
		defaultBranch: readString(row, "defaultBranch", ENDPOINT),
		description: readNullableString(row, "description", ENDPOINT),
		isPrivate: readBoolean(row, "isPrivate", ENDPOINT),
	};
}

function parseGitHubRepositorySearchResponse(
	payload: unknown,
): GitHubRepositorySearchResponse {
	const row = assertObjectRecord(payload, ENDPOINT);
	return {
		repositories: parseListResponse(
			row.repositories,
			`${ENDPOINT}:repositories`,
			parseGitHubRepositorySearchResult,
		),
	};
}

export interface GitHubApiMethods {
	searchGitHubRepositories(
		query: string,
		options?: HealthRequestOptions,
	): Promise<GitHubRepositorySearchResult[]>;
}

export function createGitHubApiMethods(
	requestWithBase: (
		path: string,
		method: "GET" | "POST" | "PATCH" | "DELETE",
		options?: HealthRequestOptions,
		body?: unknown,
	) => Promise<unknown>,
): GitHubApiMethods {
	return {
		async searchGitHubRepositories(query, options) {
			const trimmed = query.trim();
			const payload = await requestWithBase(
				`${ENDPOINT}?q=${encodeURIComponent(trimmed)}`,
				"GET",
				options,
			);
			return parseGitHubRepositorySearchResponse(payload).repositories;
		},
	};
}
```

- [ ] **Step 5: Wire client methods and project update**

Modify `packages/web/src/lib/api/board-client.ts`:

```ts
ProjectUpdateRequest,
```

Add to `BoardApiMethods`:

```ts
updateProject(
	projectId: string,
	request: ProjectUpdateRequest,
	options?: HealthRequestOptions,
): Promise<WorkspaceProjectRecord>;
```

Add inside `createBoardApiMethods`:

```ts
async updateProject(projectId, request, options) {
	const payload = await requestWithBase(
		`/api/projects/${encodePathSegment(projectId)}`,
		"PATCH",
		options,
		request,
	);
	return parseWorkspaceProjectRecord(payload);
},
```

Modify `packages/web/src/lib/api/client.ts`:

```ts
import { createGitHubApiMethods } from "./github-client";
```

Add after `boardApiMethods`:

```ts
const githubApiMethods = createGitHubApiMethods(requestWithBase);
```

Return:

```ts
...githubApiMethods,
updateProject: boardApiMethods.updateProject,
```

- [ ] **Step 6: Add query and mutation wiring**

Modify `packages/web/src/lib/api/query-keys.ts`:

```ts
githubRepositorySearch: (query: string) =>
	["server-state", "github-repository-search", query.trim()] as const,
```

Modify `packages/web/src/lib/api/queries.ts`:

```ts
import type { GitHubRepositorySearchResult } from "./types/client.types";
```

Add:

```ts
export function useGitHubRepositorySearchQuery(
	query: string,
	options?: ServerStateQueryOptions,
): UseQueryResult<GitHubRepositorySearchResult[], Error> {
	const trimmed = query.trim();
	return useQuery({
		queryKey: serverStateQueryKeys.githubRepositorySearch(trimmed),
		queryFn: () => apiClient.searchGitHubRepositories(trimmed),
		enabled: trimmed.length >= 2 && options?.enabled !== false,
		refetchInterval: false,
	});
}
```

Modify `packages/web/src/lib/api/project-mutations.ts`:

```ts
import type {
	ProjectUpdateMutationInput,
} from "./types/queries.types";
```

Add:

```ts
export function useUpdateProjectMutation(): UseMutationResult<
	WorkspaceProjectRecord,
	Error,
	ProjectUpdateMutationInput
> {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ["project", "update"] as const,
		mutationFn: ({ projectId, project }) =>
			apiClient.updateProject(projectId, project),
		onSuccess: (project) => refreshUpdatedProjectCache(queryClient, project),
	});
}

export async function refreshUpdatedProjectCache(
	queryClient: Pick<QueryClient, "setQueryData" | "invalidateQueries">,
	project: WorkspaceProjectRecord,
): Promise<void> {
	queryClient.setQueryData<WorkspaceProjectRecord[] | undefined>(
		serverStateQueryKeys.workspaceProjects(project.workspaceId),
		(current) =>
			current?.map((entry) => (entry.id === project.id ? project : entry)) ?? [
				project,
			],
	);
	await queryClient.invalidateQueries({
		queryKey: serverStateQueryKeys.workspaceProjects(project.workspaceId),
	});
	await queryClient.invalidateQueries({
		queryKey: serverStateQueryKeys.projectBoard(project.workspaceId, project.id),
	});
}
```

Modify `packages/web/src/lib/api/types/queries.types.ts`:

```ts
import type {
	AgentUpdateRequest,
	ProjectCreateRequest,
	ProjectUpdateRequest,
} from "./client.types";

export interface ProjectUpdateMutationInput {
	projectId: string;
	project: ProjectUpdateRequest;
}
```

- [ ] **Step 7: Run web tests to verify GREEN**

Run:

```bash
rtk bun test packages/web/tests/project-client.test.ts packages/web/tests/project-mutations.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 3**

Run:

```bash
rtk git add packages/web/src/lib/api packages/web/tests/project-client.test.ts packages/web/tests/project-mutations.test.ts
rtk git commit -m "Add web project repository search client"
```

## Task 4: Project Form Utilities

**Files:**
- Modify: `packages/web/src/components/projects/types/projects-panel.types.ts`
- Modify: `packages/web/src/components/projects/projects-panel-utils.ts`
- Test: `packages/web/tests/projects-panel-utils.test.ts`

- [ ] **Step 1: Write failing utility tests**

Append to `packages/web/tests/projects-panel-utils.test.ts`:

```ts
import {
	buildProjectUpdateRequest,
	formStateFromProject,
	repositorySelectionFromSearchResult,
} from "../src/components/projects/projects-panel-utils";

describe("projects panel repository search helpers", () => {
	it("maps a selected GitHub repository result to create and update requests", () => {
		const selection = repositorySelectionFromSearchResult({
			id: "7",
			owner: "devos",
			name: "show-me-ur-agents",
			fullName: "devos/show-me-ur-agents",
			htmlUrl: "https://github.com/devos/show-me-ur-agents",
			cloneUrl: "https://github.com/devos/show-me-ur-agents.git",
			defaultBranch: "trunk",
			description: null,
			isPrivate: true,
		});
		const form = {
			...EMPTY_PROJECT_FORM_STATE,
			name: "Project",
			repositoryQuery: "devos/show-me-ur-agents",
			repositorySelection: selection,
		};

		expect(buildProjectCreateRequest(form, defaults)).toMatchObject({
			repoOwner: "devos",
			repoName: "show-me-ur-agents",
			baseBranch: "trunk",
		});
		expect(buildProjectUpdateRequest(form)).toMatchObject({
			name: "Project",
			repoOwner: "devos",
			repoName: "show-me-ur-agents",
			baseBranch: "trunk",
		});
	});

	it("hydrates edit form state and supports clearing repository metadata", () => {
		const project = buildProject({
			repoOwner: "devos",
			repoName: "show-me-ur-agents",
			baseBranch: "main",
		});
		const form = formStateFromProject(project);
		expect(form.repositoryQuery).toBe("devos/show-me-ur-agents");
		expect(form.repositorySelection).toEqual({
			owner: "devos",
			name: "show-me-ur-agents",
			fullName: "devos/show-me-ur-agents",
			defaultBranch: "main",
		});

		expect(
			buildProjectUpdateRequest({
				...form,
				repositoryQuery: "",
				repositorySelection: null,
			}),
		).toMatchObject({
			repoOwner: null,
			repoName: null,
			baseBranch: null,
		});
	});

	it("accepts exact owner/repo repository input without a live result", () => {
		const request = buildProjectUpdateRequest({
			...EMPTY_PROJECT_FORM_STATE,
			name: "Project",
			repositoryQuery: "devos/show-me-ur-agents",
		});

		expect(request.repoOwner).toBe("devos");
		expect(request.repoName).toBe("show-me-ur-agents");
		expect(request.baseBranch).toBe("main");
	});
});
```

- [ ] **Step 2: Run utility tests to verify RED**

Run:

```bash
rtk bun test packages/web/tests/projects-panel-utils.test.ts
```

Expected: FAIL because the new helper exports and fields do not exist.

- [ ] **Step 3: Add form and repository selection types**

Modify `packages/web/src/components/projects/types/projects-panel.types.ts`:

```ts
import type {
	GitHubRepositorySearchResult,
	WorkspaceProjectRecord,
} from "@/lib/api";

export interface ProjectRepositorySelection {
	owner: string;
	name: string;
	fullName: string;
	defaultBranch: string;
}
```

Replace `repositoryUrl: string;` in `ProjectFormState` with:

```ts
repositoryQuery: string;
repositorySelection: ProjectRepositorySelection | null;
```

Add:

```ts
export type ProjectDialogMode = "create" | "edit";

export interface ProjectRepositoryPickerResult
	extends GitHubRepositorySearchResult {}
```

- [ ] **Step 4: Update utility implementation**

Modify `packages/web/src/components/projects/projects-panel-utils.ts`:

```ts
import type {
	ProjectCreateRequest,
	ProjectUpdateRequest,
	WorkspaceProjectRecord,
} from "@/lib/api";
```

Update `EMPTY_PROJECT_FORM_STATE`:

```ts
repositoryQuery: "",
repositorySelection: null,
```

Change the repository field config name to `repositoryQuery`.

Add these exports:

```ts
export function buildProjectUpdateRequest(
	form: ProjectFormState,
): ProjectUpdateRequest {
	const name = form.name.trim();
	if (!name) {
		throw new Error("Project name is required");
	}
	const repository = resolveRepositoryInput(form);
	return {
		name,
		externalProjectId: optionalText(form.externalProjectId),
		description: optionalText(form.description),
		repoOwner: repository?.owner ?? null,
		repoName: repository?.name ?? null,
		baseBranch: repository?.defaultBranch ?? null,
		localFolder: optionalText(form.localFolder),
		lead: optionalText(form.lead),
		category: optionalText(form.category),
		priority: optionalPriority(form.priority),
	};
}

export function formStateFromProject(
	project: WorkspaceProjectRecord,
): ProjectFormState {
	const hasRepository = Boolean(project.repoOwner && project.repoName);
	const fullName = hasRepository
		? `${project.repoOwner}/${project.repoName}`
		: "";
	return {
		name: project.name,
		externalProjectId: project.externalProjectId ?? "",
		description: project.description ?? "",
		repositoryQuery: fullName,
		repositorySelection: hasRepository
			? {
					owner: project.repoOwner ?? "",
					name: project.repoName ?? "",
					fullName,
					defaultBranch: project.baseBranch ?? "main",
				}
			: null,
		localFolder: project.localFolder ?? "",
		lead: project.lead ?? "",
		category: project.category ?? "",
		priority: project.priority === null ? "" : String(project.priority),
	};
}

export function repositorySelectionFromSearchResult(
	result: ProjectRepositoryPickerResult,
): ProjectRepositorySelection {
	return {
		owner: result.owner,
		name: result.name,
		fullName: result.fullName,
		defaultBranch: result.defaultBranch,
	};
}
```

Update `buildProjectCreateRequest` to use:

```ts
const repository = resolveRepositoryInput(form);
```

and map:

```ts
repoOwner: repository?.owner ?? null,
repoName: repository?.name ?? null,
baseBranch: repository?.defaultBranch ?? null,
```

Replace `parseGitHubRepositoryUrl` with:

```ts
function resolveRepositoryInput(
	form: ProjectFormState,
): { owner: string; name: string; defaultBranch: string } | null {
	if (form.repositorySelection) {
		return {
			owner: form.repositorySelection.owner,
			name: form.repositorySelection.name,
			defaultBranch: form.repositorySelection.defaultBranch,
		};
	}
	const parsed = parseGitHubRepositoryInput(form.repositoryQuery);
	return parsed
		? { owner: parsed.owner, name: parsed.name, defaultBranch: "main" }
		: null;
}

function parseGitHubRepositoryInput(
	value: string,
): { owner: string; name: string } | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	const match =
		/^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(trimmed) ??
		/^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(trimmed) ??
		/^ssh:\/\/git@github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(trimmed) ??
		/^([^/\s]+)\/([^/\s]+)$/.exec(trimmed);
	if (!match) {
		throw new Error("Repository must be selected from search or entered as owner/repo");
	}
	return { owner: match[1], name: match[2] };
}
```

- [ ] **Step 5: Update existing tests from `repositoryUrl` to `repositoryQuery`**

In `packages/web/tests/projects-panel-utils.test.ts`, replace existing form
fields named `repositoryUrl` with `repositoryQuery`. Keep the expected URL
parsing assertions, and update the invalid-input error to:

```ts
"Repository must be selected from search or entered as owner/repo"
```

- [ ] **Step 6: Run utility tests to verify GREEN**

Run:

```bash
rtk bun test packages/web/tests/projects-panel-utils.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

Run:

```bash
rtk git add packages/web/src/components/projects/types/projects-panel.types.ts packages/web/src/components/projects/projects-panel-utils.ts packages/web/tests/projects-panel-utils.test.ts
rtk git commit -m "Support repository selections in project form state"
```

## Task 5: Project Create/Edit UI

**Files:**
- Create: `packages/web/src/components/projects/project-repository-picker.tsx`
- Create: `packages/web/src/components/projects/project-form-dialog.tsx`
- Delete: `packages/web/src/components/projects/project-create-dialog.tsx`
- Modify: `packages/web/src/components/projects/projects-table.tsx`
- Create: `packages/web/src/components/projects/projects-toolbar.tsx`
- Modify: `packages/web/src/components/projects/projects-panel.tsx`

- [ ] **Step 1: Write a typecheck RED checkpoint**

Run:

```bash
rtk bun run --filter web typecheck
```

Expected before edits: PASS or existing unrelated failures. Record the baseline.

- [ ] **Step 2: Add the repository picker component**

Create `packages/web/src/components/projects/project-repository-picker.tsx`:

```tsx
"use client";

import { GitBranch, Lock, Search } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { useGitHubRepositorySearchQuery } from "@/lib/api/queries";
import { cn } from "@/lib/utils";

import { repositorySelectionFromSearchResult } from "./projects-panel-utils";
import type {
	ProjectRepositoryPickerResult,
	ProjectRepositorySelection,
} from "./types/projects-panel.types";

interface ProjectRepositoryPickerProps {
	query: string;
	selection: ProjectRepositorySelection | null;
	onQueryChange: (value: string) => void;
	onSelectionChange: (selection: ProjectRepositorySelection | null) => void;
}

export function ProjectRepositoryPicker({
	query,
	selection,
	onQueryChange,
	onSelectionChange,
}: ProjectRepositoryPickerProps): ReactElement {
	const searchQuery = useGitHubRepositorySearchQuery(query, {
		enabled: query.trim().length >= 2,
		refetchIntervalMs: false,
	});
	const results = searchQuery.data ?? [];

	function updateQuery(value: string): void {
		onQueryChange(value);
		if (selection && value.trim() !== selection.fullName) {
			onSelectionChange(null);
		}
	}

	function selectResult(result: ProjectRepositoryPickerResult): void {
		const next = repositorySelectionFromSearchResult(result);
		onSelectionChange(next);
		onQueryChange(next.fullName);
	}

	return (
		<div className="grid gap-2 sm:col-span-2">
			<Typography as="label" className="grid gap-1" variant="label">
				<Typography as="span" className="text-zinc-400" variant="label">
					Repository
				</Typography>
				<span className="relative">
					<Search
						className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
						size={15}
					/>
					<Input
						className="pl-9"
						onChange={(event) => updateQuery(event.target.value)}
						placeholder="Search GitHub repositories or enter owner/repo"
						value={query}
					/>
				</span>
			</Typography>
			{selection ? (
				<Typography className="text-emerald-300" variant="description">
					Selected {selection.fullName} on {selection.defaultBranch}
				</Typography>
			) : null}
			{searchQuery.error ? (
				<Typography variant="error">{searchQuery.error.message}</Typography>
			) : null}
			{searchQuery.isFetching ? (
				<Typography variant="description">Searching GitHub...</Typography>
			) : null}
			{results.length > 0 ? (
				<div className="max-h-56 overflow-auto rounded-md border border-border bg-surface-input">
					{results.map((result) => (
						<Button
							className={cn(
								"grid h-auto w-full grid-cols-[1fr_auto] gap-2 rounded-none border-b border-border px-3 py-2 text-left last:border-b-0",
								selection?.fullName === result.fullName
									? "bg-surface-active"
									: "bg-transparent",
							)}
							key={result.id}
							onClick={() => selectResult(result)}
							type="button"
							variant="ghost"
						>
							<span className="min-w-0">
								<Typography className="truncate" variant="tableCell">
									{result.fullName}
								</Typography>
								<Typography className="truncate" variant="muted">
									{result.description ?? result.htmlUrl}
								</Typography>
							</span>
							<span className="flex items-center gap-2 text-muted-foreground">
								{result.isPrivate ? <Lock size={13} /> : null}
								<GitBranch size={13} />
								<Typography as="span" variant="description">
									{result.defaultBranch}
								</Typography>
							</span>
						</Button>
					))}
				</div>
			) : null}
		</div>
	);
}
```

- [ ] **Step 3: Replace create dialog with create/edit form dialog**

Create `packages/web/src/components/projects/project-form-dialog.tsx` by
copying the current dialog structure and using this public interface:

```tsx
interface ProjectFormDialogProps {
	form: ProjectFormState;
	formError: string | null;
	isSaving: boolean;
	mode: ProjectDialogMode;
	onClose: () => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onUpdateField: (
		field: keyof ProjectFormState,
		event: ChangeEvent<HTMLInputElement>,
	) => void;
	onRepositoryQueryChange: (value: string) => void;
	onRepositorySelectionChange: (
		selection: ProjectRepositorySelection | null,
	) => void;
}
```

Use these title and button labels:

```tsx
const title = mode === "create" ? "New project" : "Edit project";
const submitLabel = mode === "create" ? "Create project" : "Save changes";
```

Render normal fields from `PROJECT_FORM_FIELD_GROUPS`, skipping
`repositoryQuery`, and render `ProjectRepositoryPicker` inside the repository
field group:

```tsx
{group.title === "Repository" ? (
	<ProjectRepositoryPicker
		query={form.repositoryQuery}
		selection={form.repositorySelection}
		onQueryChange={onRepositoryQueryChange}
		onSelectionChange={onRepositorySelectionChange}
	/>
) : null}
```

Delete `packages/web/src/components/projects/project-create-dialog.tsx`.

- [ ] **Step 4: Add table edit action**

Modify `packages/web/src/components/projects/projects-table.tsx`:

```tsx
import { Edit3, Folder } from "lucide-react";
```

Add prop:

```ts
onEditProject: (project: ProjectDisplayRow["project"]) => void;
```

Add one column and make `PROJECT_TABLE_COLUMN_COUNT = 7`. Add a compact action
cell in `ProjectTableRow`:

```tsx
<td className={cn(rowPadding, "text-right align-middle")}>
	<Button
		aria-label={`Edit ${row.project.name}`}
		onClick={() => onEditProject(row.project)}
		size="icon"
		type="button"
		variant="ghost"
	>
		<Edit3 size={14} />
	</Button>
</td>
```

- [ ] **Step 5: Wire panel state and mutations**

Modify `packages/web/src/components/projects/projects-panel.tsx`:

```tsx
import { ProjectFormDialog } from "./project-form-dialog";
```

Replace `isCreateOpen` with:

```ts
const [dialogMode, setDialogMode] = useState<ProjectDialogMode | null>(null);
const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
```

Add update mutation:

```ts
const updateProject = useUpdateProjectMutation();
```

Add handlers:

```ts
function openEditDialog(project: WorkspaceProjectRecord): void {
	setForm(formStateFromProject(project));
	setEditingProjectId(project.id);
	setFormError(null);
	setDialogMode("edit");
}

function updateRepositoryQuery(value: string): void {
	setForm((current) => ({ ...current, repositoryQuery: value }));
}

function updateRepositorySelection(
	selection: ProjectRepositorySelection | null,
): void {
	setForm((current) => ({ ...current, repositorySelection: selection }));
}
```

Update submit logic:

```ts
if (dialogMode === "edit" && editingProjectId) {
	await updateProject.mutateAsync({
		projectId: editingProjectId,
		project: buildProjectUpdateRequest(form),
	});
} else {
	await createProject.mutateAsync(
		buildProjectCreateRequest(form, {
			boardId: LOCAL_BOARD_ID,
			ownerId: workspaceId,
		}),
	);
}
setForm({ ...EMPTY_PROJECT_FORM_STATE });
setEditingProjectId(null);
setDialogMode(null);
```

Pass `onEditProject={openEditDialog}` to `ProjectsTable`. Render
`ProjectFormDialog` when `dialogMode !== null`.

- [ ] **Step 6: Split the projects toolbar from the panel**

Create `packages/web/src/components/projects/projects-toolbar.tsx`:

```tsx
"use client";

import { LayoutGrid, List, Search } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import type { ProjectTableDensity } from "./types/projects-panel.types";

interface ProjectsToolbarProps {
	density: ProjectTableDensity;
	filteredCount: number;
	searchQuery: string;
	totalCount: number;
	onDensityChange: (density: ProjectTableDensity) => void;
	onSearchChange: (value: string) => void;
}

export function ProjectsToolbar({
	density,
	filteredCount,
	searchQuery,
	totalCount,
	onDensityChange,
	onSearchChange,
}: ProjectsToolbarProps): ReactElement {
	return (
		<div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
			<label
				className="relative min-w-60 flex-1 sm:max-w-sm"
				htmlFor="projects-search"
			>
				<Search
					className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
					size={16}
				/>
				<Input
					aria-label="Search projects"
					className="pl-9"
					id="projects-search"
					onChange={(event) => onSearchChange(event.target.value)}
					placeholder="Search projects..."
					value={searchQuery}
				/>
			</label>
			<div className="ml-auto flex flex-wrap items-center gap-3">
				<Typography className="whitespace-nowrap" variant="description">
					{filteredCount} / {totalCount}
				</Typography>
				<div className="inline-flex rounded-lg border border-border bg-card p-1">
					<DensityButton
						density="compact"
						icon={<List size={15} />}
						isActive={density === "compact"}
						label="Compact"
						onSelect={onDensityChange}
					/>
					<DensityButton
						density="comfortable"
						icon={<LayoutGrid size={15} />}
						isActive={density === "comfortable"}
						label="Comfortable"
						onSelect={onDensityChange}
					/>
				</div>
			</div>
		</div>
	);
}

function DensityButton({
	density,
	icon,
	isActive,
	label,
	onSelect,
}: {
	density: ProjectTableDensity;
	icon: ReactElement;
	isActive: boolean;
	label: string;
	onSelect: (density: ProjectTableDensity) => void;
}): ReactElement {
	return (
		<Button
			className={cn(
				"h-8 gap-2 px-2.5",
				isActive
					? "bg-surface-active text-zinc-100"
					: "text-muted-foreground hover:text-zinc-200",
			)}
			onClick={() => onSelect(density)}
			size="sm"
			type="button"
			variant="ghost"
		>
			{icon}
			<Typography as="span">{label}</Typography>
		</Button>
	);
}
```

Remove `ProjectToolbar` and `DensityButton` from
`packages/web/src/components/projects/projects-panel.tsx`, remove their unused
imports, and import:

```tsx
import { ProjectsToolbar } from "./projects-toolbar";
```

- [ ] **Step 7: Run typecheck and focused web tests**

Run:

```bash
rtk bun run --filter web typecheck
rtk bun test packages/web/tests/projects-panel-utils.test.ts packages/web/tests/project-client.test.ts packages/web/tests/project-mutations.test.ts
```

Expected: PASS. Confirm both files are within the repository line limit:

```bash
rtk wc -l packages/web/src/components/projects/projects-panel.tsx packages/web/src/components/projects/projects-toolbar.tsx
```

Expected: each listed TypeScript file is under 250 lines.

- [ ] **Step 8: Commit Task 5**

Run:

```bash
rtk git add packages/web/src/components/projects packages/web/src/lib/api packages/web/tests
rtk git commit -m "Add project create edit repository picker"
```

## Task 6: Verification And Browser Check

**Files:**
- No new source files unless verification exposes a defect.

- [ ] **Step 1: Run package-level server checks**

Run:

```bash
rtk bun run --filter devos-server check
rtk bun run --filter devos-server typecheck
rtk bun run --filter devos-server test
```

Expected: PASS.

- [ ] **Step 2: Run package-level web checks**

Run:

```bash
rtk bun run --filter web typecheck
rtk bun run --filter web build
```

Expected: PASS.

- [ ] **Step 3: Run root gates**

Run:

```bash
rtk bun run check
rtk bun run typecheck
rtk bun test
```

Expected: PASS.

- [ ] **Step 4: Verify visible UI in browser**

Run the local app:

```bash
rtk bun run dev
```

Open `http://localhost:3000/projects` in the in-app browser. Verify:

1. New project opens the form dialog.
2. Repository input accepts `owner/repo`.
3. Repository search results render for a query with a configured GitHub token.
4. Selecting a result fills the selected label and saves repository metadata.
5. Edit action opens the same dialog with existing project values.
6. Clearing the repository field saves null repository metadata.
7. No text overlaps at desktop width and at a narrow mobile viewport.

- [ ] **Step 5: Final status and optional commit**

Run:

```bash
rtk git status --short --branch
```

Expected: clean after Task 5 commits, unless verification required a fix. If a
verification fix was needed, return to the task that owns the changed files,
repeat that task's focused test command, then repeat that task's commit step
with the changed files named there.

## Self-Review

Spec coverage:

1. Live GitHub search is covered by Tasks 1, 2, 3, and 5.
2. Create/edit shared form is covered by Tasks 4 and 5.
3. Server-side credentials and error mapping are covered by Tasks 1 and 2.
4. Existing project data contracts are preserved through Task 3 cache/client work and Task 4 request builders.
5. Tests and browser verification are covered by Task 6.

Placeholder scan:

1. No `TBD`, `TODO`, or deferred implementation notes are present.
2. Each task has exact files, commands, and expected outcomes.

Type consistency:

1. `GitHubRepositorySearchResult` uses the same fields in server, web client, picker, and utility tests.
2. `ProjectRepositorySelection` maps to `repoOwner`, `repoName`, and `baseBranch`.
3. `ProjectUpdateRequest` and `ProjectUpdateMutationInput` are separated from create request types.

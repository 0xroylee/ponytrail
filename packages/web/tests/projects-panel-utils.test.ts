import { describe, expect, it } from "bun:test";
import {
	DEFAULT_PROJECT_EMOJI,
	EMPTY_PROJECT_FORM_STATE,
	buildProjectCreateRequest,
	buildProjectDisplayRows,
	buildProjectEditFormState,
	buildProjectUpdateRequest,
	filterProjects,
	formatProjectCreatedAt,
	resolveRepositorySelectorState,
} from "../src/components/projects/projects-panel-utils";
import type { ProjectFormState } from "../src/components/projects/types/projects-panel.types";
import type {
	GitHubRepositoryRecord,
	WorkspaceProjectRecord,
} from "../src/lib/api";

const defaults = { boardId: "board-1", ownerId: "owner-1" };
const connected = {
	isConfigured: true,
	isConnected: true,
	login: "octo",
	unavailableReason: null,
};

// biome-ignore format: keep this pure-helper test under the repo 250-line limit.
describe("projects panel utils", () => {
	it("maps manual and discovered repositories to create requests", () => {
		expect(buildProjectCreateRequest({
			...EMPTY_PROJECT_FORM_STATE,
			name: "  Web Project  ",
			emoji: "🧭",
			description: "  Created from UI  ",
			repositoryMode: "manual",
			manualRepository: "  octo/demo  ",
		}, defaults)).toMatchObject({
			name: "Web Project",
			emoji: "🧭",
			description: "Created from UI",
			repoOwner: "octo",
			repoName: "demo",
			baseBranch: "main",
		});
		expect(buildProjectCreateRequest({
			...EMPTY_PROJECT_FORM_STATE,
			name: "Web Project",
			repositoryMode: "select",
			selectedRepository: "octo/core",
		}, defaults, [repositoryOption({ name: "core", nameWithOwner: "octo/core", defaultBranch: "trunk" })])).toMatchObject({
			repoOwner: "octo",
			repoName: "core",
			baseBranch: "trunk",
		});
	});

	it("normalizes blanks and validates create inputs", () => {
		expect(buildProjectCreateRequest({ ...EMPTY_PROJECT_FORM_STATE, name: "Web Project" }, defaults)).toEqual({
			boardId: "board-1",
			ownerId: "owner-1",
			name: "Web Project",
			emoji: DEFAULT_PROJECT_EMOJI,
			externalProjectId: null,
			description: null,
			repoOwner: null,
			repoName: null,
			baseBranch: null,
			localFolder: null,
			lead: null,
			category: null,
			priority: null,
		});
		expect(() => buildProjectCreateRequest({ ...EMPTY_PROJECT_FORM_STATE, name: " " }, defaults)).toThrow("Project name is required");
		expect(() => buildProjectCreateRequest({
			...EMPTY_PROJECT_FORM_STATE,
			name: "Web Project",
			repositoryMode: "manual",
			manualRepository: "https://github.com/octo/demo",
		}, defaults)).toThrow("Repository must be owner/repo");
	});

	it("prefills and maps editable project metadata", () => {
		expect(buildProjectEditFormState(buildProject())).toEqual({
			name: "Project",
			emoji: DEFAULT_PROJECT_EMOJI,
			description: "Project description",
			repositoryMode: "manual",
			selectedRepository: "",
			manualRepository: "devos/show-me-ur-agents",
			lead: "",
			priority: "2",
		});
		const form: ProjectFormState = {
			...EMPTY_PROJECT_FORM_STATE,
			name: "  Web Project Updated  ",
			emoji: "🚀",
			description: "  Edited from UI  ",
			repositoryMode: "select",
			selectedRepository: "octo/core",
			lead: "  Roy  ",
			priority: "3",
		};
		expect(buildProjectUpdateRequest(form, [
			repositoryOption({ name: "core", nameWithOwner: "octo/core", defaultBranch: "trunk" }),
		])).toEqual({
			name: "Web Project Updated",
			emoji: "🚀",
			description: "Edited from UI",
			repoOwner: "octo",
			repoName: "core",
			baseBranch: "trunk",
			lead: "Roy",
			priority: 3,
		});
	});

	it("clears optional edit fields and validates priority", () => {
		expect(buildProjectUpdateRequest({
			...EMPTY_PROJECT_FORM_STATE,
			name: "Web Project",
			emoji: " ",
			description: " ",
			repositoryMode: "manual",
			manualRepository: " ",
			lead: " ",
			priority: " ",
		})).toMatchObject({
			emoji: DEFAULT_PROJECT_EMOJI,
			description: null,
			repoOwner: null,
			repoName: null,
			baseBranch: null,
			lead: null,
			priority: null,
		});
		expect(() => buildProjectUpdateRequest({ ...EMPTY_PROJECT_FORM_STATE, name: "Web Project", priority: "high" })).toThrow("Priority must be a whole number");
	});

	it("filters projects and builds display rows", () => {
		const projects = [
			buildProject({ id: "web", name: "Web", repoName: "operator-ui" }),
			buildProject({ id: "worker", name: "Worker", category: "automation", lead: "Roy" }),
		];
		expect(filterProjects(projects, "operator")).toEqual([projects[0]]);
		expect(filterProjects(projects, "ROY")).toEqual([projects[1]]);
		expect(filterProjects(projects, " ")).toEqual(projects);
		const [row] = buildProjectDisplayRows([
			buildProject({ description: null, priority: null, repoOwner: null, repoName: null, createdAt: "2026-05-01T00:00:00.000Z" }),
		], new Date("2026-05-22T00:00:00.000Z"));
		expect(row).toMatchObject({
			emojiLabel: DEFAULT_PROJECT_EMOJI,
			priorityLabel: "--",
			repositoryLabel: "--",
			leadLabel: "--",
			createdLabel: "3w ago",
			summaryLabel: "project-1",
		});
	});

	it("formats project created dates as compact relative labels", () => {
		const now = new Date("2026-05-25T12:00:00.000Z");
		expect(formatProjectCreatedAt("2026-05-25T11:59:40.000Z", now)).toBe("Just now");
		expect(formatProjectCreatedAt("2026-05-25T10:00:00.000Z", now)).toBe("2h ago");
		expect(formatProjectCreatedAt("not-a-date", now)).toBe("--");
	});

	it("resolves GitHub connection and repository loading states", () => {
		const cases = [
			{
				input: { connection: { isConfigured: false, isConnected: false, login: null, unavailableReason: "GitHub OAuth is not configured" }, hasRepositoryOptions: false, isRepositoryLoading: false, isRepositoryError: false, repositoryUnavailableReason: null },
				expected: { canSelectRepository: false, shouldShowConnect: false, shouldShowRetry: false, statusMessage: "GitHub OAuth is not configured; manual entry is still available." },
			},
			{
				input: { connection: { ...connected, isConnected: false, login: null }, hasRepositoryOptions: false, isRepositoryLoading: false, isRepositoryError: false, repositoryUnavailableReason: null },
				expected: { canSelectRepository: false, shouldShowConnect: true, shouldShowRetry: false, statusMessage: "Connect GitHub to list repositories." },
			},
			{
				input: { connection: connected, hasRepositoryOptions: false, isRepositoryLoading: true, isRepositoryError: false, repositoryUnavailableReason: null },
				expected: { canSelectRepository: false, shouldShowConnect: false, shouldShowRetry: false, statusMessage: "Loading repositories." },
			},
			{
				input: { connection: connected, hasRepositoryOptions: true, isRepositoryLoading: false, isRepositoryError: false, repositoryUnavailableReason: null },
				expected: { canSelectRepository: true, shouldShowConnect: false, shouldShowRetry: false, statusMessage: null },
			},
			{
				input: { connection: connected, hasRepositoryOptions: false, isRepositoryLoading: false, isRepositoryError: true, repositoryUnavailableReason: null },
				expected: { canSelectRepository: false, shouldShowConnect: false, shouldShowRetry: true, statusMessage: "GitHub repositories unavailable; manual entry is still available." },
			},
		];
		for (const item of cases) expect(resolveRepositorySelectorState(item.input)).toEqual(item.expected);
	});
});

function buildProject(
	overrides: Partial<WorkspaceProjectRecord> = {},
): WorkspaceProjectRecord {
	return {
		id: "project-1",
		boardId: "board-1",
		workspaceId: "owner-1",
		externalProjectId: null,
		name: "Project",
		emoji: null,
		description: "Project description",
		repoOwner: "devos",
		repoName: "show-me-ur-agents",
		baseBranch: "main",
		localFolder: null,
		lead: null,
		category: null,
		priority: 2,
		createdAt: "2026-05-25T00:00:00.000Z",
		updatedAt: "2026-05-25T00:00:00.000Z",
		...overrides,
	};
}

function repositoryOption(
	overrides: Partial<GitHubRepositoryRecord> = {},
): GitHubRepositoryRecord {
	return {
		id: "octo/demo",
		owner: "octo",
		name: "demo",
		nameWithOwner: "octo/demo",
		defaultBranch: "main",
		isPrivate: false,
		...overrides,
	};
}

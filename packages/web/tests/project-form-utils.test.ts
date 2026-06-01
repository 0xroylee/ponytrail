import { describe, expect, it } from "bun:test";
import {
	DEFAULT_PROJECT_EMOJI,
	EMPTY_PROJECT_FORM_STATE,
	buildProjectCreateRequest,
	buildProjectUpdateRequest,
	formStateFromProject,
	repositorySelectionFromSearchResult,
} from "../src/components/projects/project-form-utils";
import type { WorkspaceProjectRecord } from "../src/lib/api";

const defaults = {
	boardId: "board-1",
	ownerId: "owner-1",
};

describe("project form request builder", () => {
	it("maps a GitHub HTTPS repository URL to the API request", () => {
		const request = buildProjectCreateRequest(
			{
				...EMPTY_PROJECT_FORM_STATE,
				name: "  Web Project  ",
				externalProjectId: "  external-1  ",
				description: "  Created from UI  ",
				repositoryQuery: "  https://github.com/octo/demo.git  ",
				repositorySelection: null,
				localFolder: "  /tmp/demo  ",
				lead: "  Roy  ",
				category: "  platform  ",
				priority: " 2 ",
			},
			defaults,
		);

		expect(request).toEqual({
			boardId: "board-1",
			ownerId: "owner-1",
			name: "Web Project",
			emoji: DEFAULT_PROJECT_EMOJI,
			externalProjectId: "external-1",
			description: "Created from UI",
			repoOwner: "octo",
			repoName: "demo",
			baseBranch: "main",
			localFolder: "/tmp/demo",
			lead: "Roy",
			category: "platform",
			priority: 2,
		});
	});

	it("parses supported GitHub repository URL forms", () => {
		const cases = [
			"https://github.com/octo/demo",
			"https://github.com/octo/demo.git",
			"git@github.com:octo/demo.git",
			"ssh://git@github.com/octo/demo.git",
		];

		for (const repositoryQuery of cases) {
			const request = buildProjectCreateRequest(
				{
					...EMPTY_PROJECT_FORM_STATE,
					name: "Web Project",
					repositoryQuery,
				},
				defaults,
			);

			expect(request.repoOwner).toBe("octo");
			expect(request.repoName).toBe("demo");
			expect(request.baseBranch).toBe("main");
		}
	});

	it("normalizes optional blank fields to null", () => {
		const request = buildProjectCreateRequest(
			{
				...EMPTY_PROJECT_FORM_STATE,
				name: "Web Project",
			},
			defaults,
		);

		expect(request).toEqual({
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
	});

	it("requires a valid GitHub repository URL when one is provided", () => {
		expect(() =>
			buildProjectCreateRequest(
				{
					...EMPTY_PROJECT_FORM_STATE,
					name: "Web Project",
					repositoryQuery: "https://gitlab.com/octo/demo",
				},
				defaults,
			),
		).toThrow(
			"Repository must be selected from search or entered as owner/repo",
		);
	});

	it("requires a project name and integer priority", () => {
		expect(() =>
			buildProjectCreateRequest(
				{ ...EMPTY_PROJECT_FORM_STATE, name: " " },
				defaults,
			),
		).toThrow("Project name is required");
		expect(() =>
			buildProjectCreateRequest(
				{
					...EMPTY_PROJECT_FORM_STATE,
					name: "Web Project",
					priority: "1.5",
				},
				defaults,
			),
		).toThrow("Priority must be a whole number");
	});
});

describe("project form repository search helpers", () => {
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
		const form = formStateFromProject(
			buildProject({
				repoOwner: "devos",
				repoName: "show-me-ur-agents",
				baseBranch: "main",
			}),
		);
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

function buildProject(
	overrides: Partial<WorkspaceProjectRecord> = {},
): WorkspaceProjectRecord {
	return {
		id: "project-1",
		boardId: "board-1",
		workspaceId: "owner-1",
		externalProjectId: null,
		name: "Project",
		description: "Project description",
		emoji: null,
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

import { describe, expect, it } from "bun:test";
import {
	DEFAULT_PROJECT_EMOJI,
	EMPTY_PROJECT_FORM_STATE,
	buildProjectCreateRequest,
	buildProjectEditFormState,
	buildProjectUpdateRequest,
} from "../src/components/projects/projects-panel-utils";
import type { ProjectFormState } from "../src/components/projects/types/projects-panel.types";
import type {
	GitHubRepositoryRecord,
	WorkspaceProjectRecord,
} from "../src/lib/api";

const defaults = { boardId: "board-1", ownerId: "owner-1" };

describe("projects panel utils", () => {
	it("builds project requests from manual and selected repositories", () => {
		const manual = buildProjectCreateRequest(
			projectForm({
				name: "  Web Project  ",
				emoji: "🧭",
				description: "  Created from UI  ",
				repositoryMode: "manual",
				manualRepository: "  octo/demo  ",
			}),
			defaults,
		);
		const selected = buildProjectCreateRequest(
			projectForm({
				name: "Web Project",
				repositoryMode: "select",
				selectedRepository: "octo/core",
			}),
			defaults,
			[
				repositoryOption({
					name: "core",
					nameWithOwner: "octo/core",
					defaultBranch: "trunk",
				}),
			],
		);

		expect(manual).toMatchObject({
			name: "Web Project",
			emoji: "🧭",
			description: "Created from UI",
			repoOwner: "octo",
			repoName: "demo",
			baseBranch: "main",
		});
		expect(selected).toMatchObject({
			repoOwner: "octo",
			repoName: "core",
			baseBranch: "trunk",
		});
		expect(() =>
			buildProjectCreateRequest(projectForm({ name: " " }), defaults),
		).toThrow("Project name is required");
		expect(() =>
			buildProjectCreateRequest(
				projectForm({
					name: "Web Project",
					repositoryMode: "manual",
					manualRepository: "https://github.com/octo/demo",
				}),
				defaults,
			),
		).toThrow("Repository must be owner/repo");
	});

	it("normalizes update fields and validates priority", () => {
		const updated = buildProjectUpdateRequest(
			projectForm({
				name: "  Web Project Updated  ",
				emoji: "🚀",
				description: "  Edited from UI  ",
				repositoryMode: "select",
				selectedRepository: "octo/core",
				lead: "  Roy  ",
				priority: "3",
			}),
			[repositoryOption({ name: "core", nameWithOwner: "octo/core" })],
		);
		const cleared = buildProjectUpdateRequest(
			projectForm({
				name: "Web Project",
				emoji: " ",
				description: " ",
				repositoryMode: "manual",
				manualRepository: " ",
				lead: " ",
				priority: " ",
			}),
		);
		const preservedBranch = buildProjectUpdateRequest(
			projectForm({
				name: "Web Project",
				repositoryMode: "manual",
				manualRepository: "octo/demo",
				originalManualRepository: "octo/demo",
				baseBranch: "develop",
			}),
		);
		const changedRepository = buildProjectUpdateRequest(
			projectForm({
				name: "Web Project",
				repositoryMode: "manual",
				manualRepository: "octo/new",
				originalManualRepository: "octo/demo",
				baseBranch: "develop",
			}),
		);

		expect(updated).toMatchObject({
			name: "Web Project Updated",
			emoji: "🚀",
			description: "Edited from UI",
			repoOwner: "octo",
			repoName: "core",
			lead: "Roy",
			priority: 3,
		});
		expect(cleared).toMatchObject({
			emoji: DEFAULT_PROJECT_EMOJI,
			description: null,
			repoOwner: null,
			repoName: null,
			priority: null,
		});
		expect(preservedBranch.baseBranch).toBe("develop");
		expect(changedRepository.baseBranch).toBe("main");
		expect(() =>
			buildProjectUpdateRequest(
				projectForm({ name: "Web Project", priority: "high" }),
			),
		).toThrow("Priority must be a whole number");
	});

	it("preserves the existing branch when saving an edited manual repository", () => {
		const hydratedForm = buildProjectEditFormState(
			projectRecord({
				repoOwner: "octo",
				repoName: "demo",
				baseBranch: "develop",
			}),
		);

		expect(buildProjectUpdateRequest(hydratedForm).baseBranch).toBe("develop");
		expect(
			buildProjectUpdateRequest({
				...hydratedForm,
				manualRepository: "octo/new",
			}).baseBranch,
		).toBe("main");
	});
});

function projectForm(overrides: Partial<ProjectFormState>): ProjectFormState {
	return { ...EMPTY_PROJECT_FORM_STATE, ...overrides };
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

function projectRecord(
	overrides: Partial<WorkspaceProjectRecord> = {},
): WorkspaceProjectRecord {
	return {
		id: "project-1",
		boardId: "board-1",
		workspaceId: "workspace-1",
		externalProjectId: null,
		name: "Project",
		emoji: null,
		description: null,
		repoOwner: null,
		repoName: null,
		baseBranch: null,
		localFolder: null,
		lead: null,
		category: null,
		priority: null,
		createdAt: "2026-05-31T00:00:00.000Z",
		updatedAt: "2026-05-31T00:00:00.000Z",
		...overrides,
	};
}

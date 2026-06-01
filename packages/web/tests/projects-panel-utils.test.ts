import { describe, expect, it } from "bun:test";
import {
	DEFAULT_PROJECT_EMOJI,
	buildProjectDisplayRows,
	filterProjects,
	formatProjectCreatedAt,
} from "../src/components/projects/projects-panel-utils";
import type { WorkspaceProjectRecord } from "../src/lib/api";

describe("projects panel table helpers", () => {
	it("filters projects across key display fields", () => {
		const projects = [
			buildProject({ id: "web", name: "Web", repoName: "operator-ui" }),
			buildProject({
				id: "worker",
				name: "Worker",
				lead: "Roy",
			}),
		];

		expect(filterProjects(projects, "operator")).toEqual([projects[0]]);
		expect(filterProjects(projects, "ROY")).toEqual([projects[1]]);
		expect(filterProjects(projects, " ")).toEqual(projects);
	});

	it("builds display rows with concise fallbacks", () => {
		const [row] = buildProjectDisplayRows(
			[
				buildProject({
					description: null,
					emoji: null,
					priority: null,
					repoOwner: null,
					repoName: null,
					createdAt: "2026-05-01T00:00:00.000Z",
				}),
			],
			new Date("2026-05-22T00:00:00.000Z"),
		);

		expect(row).toMatchObject({
			emojiLabel: DEFAULT_PROJECT_EMOJI,
			priorityLabel: "--",
			categoryLabel: "--",
			repositoryLabel: "--",
			leadLabel: "--",
			createdLabel: "3w ago",
			summaryLabel: "project-1",
		});
	});

	it("formats project created dates as compact relative labels", () => {
		const now = new Date("2026-05-25T12:00:00.000Z");

		expect(formatProjectCreatedAt("2026-05-25T11:59:40.000Z", now)).toBe(
			"Just now",
		);
		expect(formatProjectCreatedAt("2026-05-25T10:00:00.000Z", now)).toBe(
			"2h ago",
		);
		expect(formatProjectCreatedAt("2026-05-04T12:00:00.000Z", now)).toBe(
			"3w ago",
		);
		expect(formatProjectCreatedAt("not-a-date", now)).toBe("--");
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

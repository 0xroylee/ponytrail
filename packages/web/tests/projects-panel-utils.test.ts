import { describe, expect, it } from "bun:test";
import {
	EMPTY_PROJECT_FORM_STATE,
	buildProjectCreateRequest,
} from "../src/components/projects/projects-panel-utils";

const defaults = {
	boardId: "board-1",
	ownerId: "owner-1",
};

describe("projects panel create request builder", () => {
	it("maps full project setup fields to the API request", () => {
		const request = buildProjectCreateRequest(
			{
				name: "  Web Project  ",
				externalProjectId: "  external-1  ",
				description: "  Created from UI  ",
				repoOwner: "  octo  ",
				repoName: "  demo  ",
				baseBranch: "  trunk  ",
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
			externalProjectId: "external-1",
			description: "Created from UI",
			repoOwner: "octo",
			repoName: "demo",
			baseBranch: "trunk",
			localFolder: "/tmp/demo",
			lead: "Roy",
			category: "platform",
			priority: 2,
		});
	});

	it("normalizes optional blank fields to null", () => {
		const request = buildProjectCreateRequest(
			{
				...EMPTY_PROJECT_FORM_STATE,
				name: "Web Project",
				baseBranch: "",
			},
			defaults,
		);

		expect(request).toEqual({
			boardId: "board-1",
			ownerId: "owner-1",
			name: "Web Project",
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
		).toThrow("Priority must be an integer");
	});
});

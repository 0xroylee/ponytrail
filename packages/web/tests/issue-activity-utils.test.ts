import { describe, expect, it } from "bun:test";

import { createActivityDisclosureState } from "../src/components/issues-board/issue-activity-utils";

describe("issue activity utils", () => {
	it("keeps activity entries expanded until collapsed", () => {
		expect(
			createActivityDisclosureState({
				activityCount: 3,
				isCollapsed: false,
			}),
		).toEqual({
			ariaExpanded: true,
			countLabel: "3 activities",
			isListHidden: false,
			listClassName: "grid gap-3",
		});

		expect(
			createActivityDisclosureState({
				activityCount: 3,
				isCollapsed: true,
			}),
		).toEqual({
			ariaExpanded: false,
			countLabel: "3 activities",
			isListHidden: true,
			listClassName: "hidden",
		});
	});
});

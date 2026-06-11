import { describe, expect, it } from "bun:test";

import { shouldLoadMissionProgressForContentMode } from "../src/components/chat-room/chat-room-mission";

describe("chat room mission loading", () => {
	it("does not load mission progress while the Messages tab is active", () => {
		expect(shouldLoadMissionProgressForContentMode("messages")).toBe(false);
	});

	it("loads mission progress for the Action tab", () => {
		expect(shouldLoadMissionProgressForContentMode("action")).toBe(true);
	});
});

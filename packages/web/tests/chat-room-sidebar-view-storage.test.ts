import { describe, expect, it } from "bun:test";

import {
	readStoredChatRoomSidebarView,
	writeStoredChatRoomSidebarView,
} from "../src/components/chat-room/chat-room-sidebar-utils";

describe("chat room sidebar view storage", () => {
	it("restores a persisted settings sidebar view", () => {
		const storage = createMemoryStorage([
			["devos.chatRoom.sidebarView", "settings"],
		]);

		expect(readStoredChatRoomSidebarView(storage)).toBe("settings");
	});

	it("falls back to the main sidebar view for invalid persisted values", () => {
		const storage = createMemoryStorage([
			["devos.chatRoom.sidebarView", "other"],
		]);

		expect(readStoredChatRoomSidebarView(storage)).toBe("main");
	});

	it("persists the selected sidebar view", () => {
		const storage = createMemoryStorage();

		writeStoredChatRoomSidebarView(storage, "settings");

		expect(storage.getItem("devos.chatRoom.sidebarView")).toBe("settings");
	});
});

function createMemoryStorage(
	entries: [string, string][] = [],
): Pick<Storage, "getItem" | "setItem"> {
	const values = new Map(entries);
	return {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => {
			values.set(key, value);
		},
	};
}

import { describe, expect, it } from "bun:test";

type UiStoreModule = typeof import("../src/lib/ui-store/ui-store");

describe("chat message input focus request", () => {
	it("targets focus requests to the created session", async () => {
		const useUiStore = await loadUiStoreWithStorage(createMemoryStorage());

		useUiStore.getState().requestMessageInputFocus("session-1");
		const firstRequest = useUiStore.getState().messageInputFocusRequest;

		expect(firstRequest).toEqual({ id: 1, sessionId: "session-1" });

		useUiStore.getState().requestMessageInputFocus("session-2");

		expect(useUiStore.getState().messageInputFocusRequest).toEqual({
			id: 2,
			sessionId: "session-2",
		});
	});

	it("only clears the active focus request", async () => {
		const useUiStore = await loadUiStoreWithStorage(createMemoryStorage());

		useUiStore.getState().requestMessageInputFocus("session-1");
		useUiStore.getState().clearMessageInputFocusRequest(2);

		expect(useUiStore.getState().messageInputFocusRequest).toEqual({
			id: 1,
			sessionId: "session-1",
		});

		useUiStore.getState().clearMessageInputFocusRequest(1);

		expect(useUiStore.getState().messageInputFocusRequest).toBeNull();
	});

	it("does not persist focus requests", async () => {
		const storage = createMemoryStorage();
		const useUiStore = await loadUiStoreWithStorage(storage);

		useUiStore.getState().requestMessageInputFocus("session-1");

		expect(storage.length).toBe(0);
	});
});

async function loadUiStoreWithStorage(
	storage: Storage,
): Promise<UiStoreModule["useUiStore"]> {
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: storage,
	});
	const module = (await import(
		`../src/lib/ui-store/ui-store.ts?test=${Date.now()}-${Math.random()}`
	)) as UiStoreModule;
	return module.useUiStore;
}

function createMemoryStorage(entries: [string, string][] = []): Storage {
	const values = new Map(entries);
	return {
		clear: () => {
			values.clear();
		},
		key: (index) => [...values.keys()][index] ?? null,
		get length() {
			return values.size;
		},
		getItem: (key) => values.get(key) ?? null,
		removeItem: (key) => {
			values.delete(key);
		},
		setItem: (key, value) => {
			values.set(key, value);
		},
	};
}

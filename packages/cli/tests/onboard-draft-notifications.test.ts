import { describe, expect, it } from "bun:test";
import { collectOnboardDraft } from "../src/features/onboard";
import type { PromptAdapter } from "../src/features/prompts";

describe("onboard notification prompts", () => {
	it("defaults email notifications off without prompting during onboard", async () => {
		const confirmMessages: string[] = [];
		const draft = await collectOnboardDraft("/tmp/demo", {
			prompts: promptAdapter(confirmMessages),
		});

		expect(confirmMessages).not.toContain("Enable email notifications?");
		expect(draft.notifications.email).toEqual({ enabled: false, to: [] });
	});
});

function promptAdapter(confirmMessages: string[]): PromptAdapter {
	return {
		async text(options) {
			return options.defaultValue ?? "";
		},
		async password() {
			throw new Error("password prompt should not be called");
		},
		async confirm(options) {
			confirmMessages.push(options.message);
			return options.initialValue ?? false;
		},
		async select(options) {
			return options.initialValue ?? options.options[0].value;
		},
	};
}

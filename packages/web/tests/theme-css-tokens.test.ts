import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const GLOBALS_CSS_PATH = path.resolve(
	import.meta.dir,
	"../src/app/globals.css",
);

function readGlobalsCss(): string {
	return readFileSync(GLOBALS_CSS_PATH, "utf8");
}

function hasToken(css: string, token: string): boolean {
	const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const matcher = new RegExp(`--${escaped}\\s*:`);
	return matcher.test(css);
}

describe("theme css token contract", () => {
	it("defines all runtime theme tokens used by panel and card surfaces", () => {
		const css = readGlobalsCss();
		const requiredTokens = [
			"bg-card",
			"bg-control",
			"bg-control-subtle",
			"bg-interactive",
			"border-strong",
			"backdrop-strong",
			"status-neutral-bg",
			"status-neutral-border",
			"status-implementing-bg",
			"status-implementing-border",
			"status-reviewing-bg",
			"status-reviewing-border",
			"status-testing-bg",
			"status-testing-border",
			"status-done-bg",
			"status-done-border",
		];

		for (const token of requiredTokens) {
			expect(hasToken(css, token)).toBe(true);
		}
	});
});

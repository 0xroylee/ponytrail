import { describe, expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const cliRoot = path.resolve(import.meta.dir, "..");

describe("agent adapter package boundary", () => {
	test("keeps Claude binary discovery out of CLI utility shims", async () => {
		const sourceFiles = await collectFiles(path.join(cliRoot, "src"));
		const relativeFiles = sourceFiles.map((file) =>
			path.relative(cliRoot, file),
		);
		const importOffenders: string[] = [];

		for (const file of sourceFiles) {
			const content = await readFile(file, "utf8");
			if (content.includes("utils/claude-path")) {
				importOffenders.push(path.relative(cliRoot, file));
			}
		}

		expect(relativeFiles).not.toContain("src/utils/claude-path.ts");
		expect(importOffenders).toEqual([]);
	});
});

async function collectFiles(root: string): Promise<string[]> {
	const entries = await readdir(root, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map(async (entry) => {
			const entryPath = path.join(root, entry.name);
			if (entry.isDirectory()) {
				return collectFiles(entryPath);
			}
			return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
		}),
	);
	return nested.flat();
}

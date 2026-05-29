import { describe, expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const cliRoot = path.resolve(import.meta.dir, "..");
const removedTrackerNames = [`lin${"ear"}`, `lin${"era"}`];

describe("removed tracker surface", () => {
	test("does not ship the removed tracker SDK dependency", async () => {
		const packageJson = JSON.parse(
			await readFile(path.join(cliRoot, "package.json"), "utf8"),
		) as { dependencies?: Record<string, string> };
		const dependencyNames = Object.keys(packageJson.dependencies ?? {});

		expect(dependencyNames).not.toContain(`@${removedTrackerNames[0]}/sdk`);
	});

	test("keeps CLI source free of removed tracker names", async () => {
		const sourceFiles = await collectFiles(path.join(cliRoot, "src"));
		const offenders: string[] = [];

		for (const file of sourceFiles) {
			const content = (await readFile(file, "utf8")).toLowerCase();
			for (const name of removedTrackerNames) {
				if (content.includes(name)) {
					offenders.push(path.relative(cliRoot, file));
					break;
				}
			}
		}

		expect(offenders).toEqual([]);
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

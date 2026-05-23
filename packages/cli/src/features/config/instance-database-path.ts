import { readFile } from "node:fs/promises";
import { normalizeOptionalValue } from "./env-normalizers";
import { instanceConfigPath } from "./home-paths";

export async function loadInstanceServerDatabasePath(
	readText: (
		targetPath: string,
		encoding: BufferEncoding,
	) => Promise<string> = readFile,
): Promise<string | undefined> {
	let content: string;
	try {
		content = await readText(instanceConfigPath(), "utf8");
	} catch {
		return undefined;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		return undefined;
	}

	if (!isRecord(parsed) || !isRecord(parsed.database)) {
		return undefined;
	}

	const dataDir = parsed.database.embeddedPostgresDataDir;
	return typeof dataDir === "string"
		? normalizeOptionalValue(dataDir)
		: undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

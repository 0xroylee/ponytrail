import { describe, expect, it } from "bun:test";
import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { backupDatabase } from "../scripts/backup";
import { migrateDatabase } from "../scripts/migrate";
import {
	createDatabasePort,
	readMigrationCount,
	withDatabasePath,
} from "./helpers/database-script-helpers";

const EMBEDDED_POSTGRES_TEST_TIMEOUT_MS = 20_000;

describe("database backup script", () => {
	it(
		"omits stale PostgreSQL runtime files from copied backups",
		() =>
			withDatabasePath(async (dbPath) => {
				await migrateDatabase({ dbPath, port: await createDatabasePort() });
				const staleRuntimeFiles = ["postmaster.pid", "postmaster.opts"];

				for (const fileName of staleRuntimeFiles) {
					await writeFile(path.join(dbPath, fileName), "stale runtime state");
				}

				const result = await backupDatabase({
					dbPath,
					now: new Date("2026-05-20T01:02:03.004Z"),
				});

				for (const fileName of staleRuntimeFiles) {
					await expectPath(path.join(dbPath, fileName), true);
					await expectPath(path.join(result.backupPath, fileName), false);
				}
				await expect(
					readMigrationCount(result.backupPath),
				).resolves.toBeGreaterThan(0);
			}),
		EMBEDDED_POSTGRES_TEST_TIMEOUT_MS,
	);
});

async function expectPath(filePath: string, exists: boolean): Promise<void> {
	await expect(pathExists(filePath)).resolves.toBe(exists);
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await stat(filePath);
		return true;
	} catch {
		return false;
	}
}

import path from "node:path";
import { CliCommandExecutor } from "adhdai/features/server/cli-command-executor";
import { createHandleRequest } from "./app";
import { initializeServerDatabase } from "./db";

function resolveDatabasePath(cwd: string): string {
	return (
		process.env.PIV_SERVER_DATABASE_PATH?.trim() ||
		path.join(cwd, ".piv-loop", "config", "server-db")
	);
}

export async function startServer(port = 3000): Promise<Bun.Server<undefined>> {
	const cwd = process.cwd();
	const database = await initializeServerDatabase(resolveDatabasePath(cwd));
	return Bun.serve({
		port,
		fetch: createHandleRequest({
			cliExecutor: new CliCommandExecutor({
				cwd,
				command: "bun",
				baseArgs: ["run", "./packages/cli/src/index.ts"],
			}),
			db: database.db,
		}),
	});
}

if (import.meta.main) {
	await startServer();
}

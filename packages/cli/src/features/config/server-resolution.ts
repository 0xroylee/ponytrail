import type { DevosRootConfig, ProjectRuntimeConfig } from "../types";
import { normalizeOptionalPath } from "./path-resolution";
import type { ServerRuntimeConfig } from "./types/server.types";

export function resolveRootServerConfig(
	configCwd: string,
	base: ProjectRuntimeConfig,
	root: DevosRootConfig,
): ServerRuntimeConfig {
	return {
		database: {
			databasePath: resolveServerDatabasePathForRoot(configCwd, base, root),
			port: root.server?.database?.port ?? base.server.database.port,
		},
	};
}

export function resolveServerDatabasePathForRoot(
	configCwd: string,
	base: ProjectRuntimeConfig,
	root: DevosRootConfig,
): string {
	return (
		normalizeOptionalPath(
			root.server?.database?.databasePath ?? base.server.database.databasePath,
			configCwd,
		) ?? base.server.database.databasePath
	);
}

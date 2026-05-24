import { createApiClient } from "./client";
import type { ApiClient } from "./types/client.types";

const WEB_WORKFLOW_WS_URL = "/api/workflow";

export function createWebApiClient(): ApiClient {
	return createApiClient({
		wsUrl: resolveWebServerProxyWsUrl(),
	});
}

export function resolveWebServerProxyWsUrl(
	env: NodeJS.ProcessEnv = process.env,
): string {
	return env.NEXT_PUBLIC_DEVOS_WORKFLOW_WS_URL ?? WEB_WORKFLOW_WS_URL;
}

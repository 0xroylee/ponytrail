import type { AgentRecord } from "../types/repositories.types";
import type { CrudResponseResult } from "./types/entity-crud.types";

export async function applyRuntimeAgentStatus(
	result: CrudResponseResult,
	isRuntimeReachable: (() => Promise<boolean>) | undefined,
): Promise<CrudResponseResult> {
	if (!isRuntimeReachable || !isAgentResponseBody(result.body)) {
		return result;
	}
	const reachable = await resolveRuntimeReachable(isRuntimeReachable);
	if (reachable) {
		return result;
	}
	return {
		...result,
		body: Array.isArray(result.body)
			? result.body.map(markAgentOffline)
			: markAgentOffline(result.body),
	};
}

async function resolveRuntimeReachable(
	isRuntimeReachable: () => Promise<boolean>,
): Promise<boolean> {
	try {
		return await isRuntimeReachable();
	} catch {
		return false;
	}
}

function isAgentResponseBody(
	body: CrudResponseResult["body"],
): body is AgentRecord | AgentRecord[] {
	return Array.isArray(body) ? body.every(isAgentRecord) : isAgentRecord(body);
}

function isAgentRecord(
	value: CrudResponseResult["body"],
): value is AgentRecord {
	return (
		typeof value === "object" &&
		value !== null &&
		"backend" in value &&
		"runtime" in value &&
		"status" in value
	);
}

function markAgentOffline(agent: AgentRecord): AgentRecord {
	return { ...agent, status: "offline" };
}

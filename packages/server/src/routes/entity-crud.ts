import type { ServerDatabase } from "devos-db";
import {
	DefaultAgentsError,
	getDefaultAgent,
	listDefaultAgents,
	updateDefaultAgent,
} from "../agents/default-agents";
import { applyRuntimeAgentStatus } from "./agent-runtime-status";
import {
	validateAgentCreatePayload,
	validateAgentUpdatePayload,
} from "./entity-crud-agent";
import { createEntityCrudRepository } from "./entity-crud-repository";
import { createEntityCrudService } from "./entity-crud-service";
import {
	parseJsonBody,
	validateCreatePayload,
	validateUpdatePayload,
} from "./entity-crud-validators";
import type { EntityCrudResult } from "./types/entity-crud-service.types";
import type {
	CrudResponseResult,
	CrudRouteMatch,
	SkillCreatePayload,
	SkillUpdatePayload,
} from "./types/entity-crud.types";

const SKILL_CREATE_FIELDS = [
	"id",
	"name",
	"description",
	"source",
	"updatedAt",
] as const;
const SKILL_UPDATE_FIELDS = [
	"name",
	"description",
	"source",
	"updatedAt",
] as const;

interface EntityCrudDeps {
	db: ServerDatabase["db"];
	isRuntimeReachable?: () => Promise<boolean>;
	workspacePath: string;
}

export function matchCrudRoute(pathname: string): CrudRouteMatch | null {
	const match = pathname.match(/^\/api\/(agents|skills)(?:\/([^/]+))?$/);
	if (!match) {
		return null;
	}
	return { entity: match[1] as "agents" | "skills", id: match[2] ?? null };
}

export async function handleEntityCrudRequest(
	request: Request,
	deps: EntityCrudDeps,
	route: CrudRouteMatch,
): Promise<CrudResponseResult> {
	const service = createEntityCrudService(createEntityCrudRepository(deps.db));
	try {
		if (route.entity === "agents") {
			const result = await handleAgentRequest(
				request,
				service,
				route.id,
				deps.workspacePath,
			);
			return applyRuntimeAgentStatus(result, deps.isRuntimeReachable);
		}
		return handleSkillRequest(request, service, route.id);
	} catch (error) {
		if (error instanceof DefaultAgentsError) {
			return { status: error.status, body: { error: error.message } };
		}
		throw error;
	}
}

async function handleAgentRequest(
	request: Request,
	service: ReturnType<typeof createEntityCrudService>,
	id: string | null,
	workspacePath: string,
): Promise<CrudResponseResult> {
	if (id === null) {
		if (request.method === "GET") {
			const result = await service.listAgents();
			if (result.status === "ok" && result.value.length === 0) {
				return { status: 200, body: await listDefaultAgents(workspacePath) };
			}
			return mapEntityResult(result);
		}
		if (request.method === "POST") {
			const parsed = await parseJsonBody(request);
			if (!parsed.ok) {
				return { status: 400, body: { error: parsed.error } };
			}
			const validated = validateAgentCreatePayload(parsed.value);
			if (!validated.ok) {
				return { status: 400, body: { error: validated.error } };
			}
			return mapEntityResult(await service.createAgent(validated.value), 201);
		}
		return { status: 405, body: { error: "Method Not Allowed" } };
	}

	if (request.method === "GET") {
		const result = await service.getAgent(id);
		if (result.status === "ok") {
			return mapEntityResult(result);
		}
		const defaultAgent = await getDefaultAgent(workspacePath, id);
		return defaultAgent
			? { status: 200, body: defaultAgent }
			: mapEntityResult(result);
	}

	if (request.method === "PATCH") {
		const parsed = await parseJsonBody(request);
		if (!parsed.ok) {
			return { status: 400, body: { error: parsed.error } };
		}
		const validated = validateAgentUpdatePayload(parsed.value);
		if (!validated.ok) {
			return { status: 400, body: { error: validated.error } };
		}
		const result = await service.updateAgent(id, validated.value);
		if (result.status === "ok") {
			return mapEntityResult(result);
		}
		const defaultAgent = await updateDefaultAgent(
			workspacePath,
			id,
			validated.value,
		);
		return defaultAgent
			? { status: 200, body: defaultAgent }
			: mapEntityResult(result);
	}

	if (request.method === "DELETE") {
		return mapEntityResult(await service.deleteAgent(id), 204);
	}

	return { status: 405, body: { error: "Method Not Allowed" } };
}

async function handleSkillRequest(
	request: Request,
	service: ReturnType<typeof createEntityCrudService>,
	id: string | null,
): Promise<CrudResponseResult> {
	if (id === null) {
		if (request.method === "GET") {
			return mapEntityResult(await service.listSkills());
		}
		if (request.method === "POST") {
			const parsed = await parseJsonBody(request);
			if (!parsed.ok) {
				return { status: 400, body: { error: parsed.error } };
			}
			const validated = validateCreatePayload<SkillCreatePayload>(
				parsed.value,
				SKILL_CREATE_FIELDS,
			);
			if (!validated.ok) {
				return { status: 400, body: { error: validated.error } };
			}
			return mapEntityResult(await service.createSkill(validated.value), 201);
		}
		return { status: 405, body: { error: "Method Not Allowed" } };
	}

	if (request.method === "GET") {
		return mapEntityResult(await service.getSkill(id));
	}

	if (request.method === "PATCH") {
		const parsed = await parseJsonBody(request);
		if (!parsed.ok) {
			return { status: 400, body: { error: parsed.error } };
		}
		const validated = validateUpdatePayload<SkillUpdatePayload>(
			parsed.value,
			SKILL_UPDATE_FIELDS,
		);
		if (!validated.ok) {
			return { status: 400, body: { error: validated.error } };
		}
		return mapEntityResult(await service.updateSkill(id, validated.value));
	}

	if (request.method === "DELETE") {
		return mapEntityResult(await service.deleteSkill(id), 204);
	}

	return { status: 405, body: { error: "Method Not Allowed" } };
}

type CrudBody = Exclude<CrudResponseResult["body"], undefined>;

function mapEntityResult<T extends CrudBody>(
	result: EntityCrudResult<T>,
	successStatus = 200,
): CrudResponseResult {
	if (result.status === "ok") {
		return { status: successStatus, body: result.value };
	}
	if (result.status === "deleted") {
		return { status: successStatus };
	}
	return { status: 404, body: { error: "Not Found" } };
}

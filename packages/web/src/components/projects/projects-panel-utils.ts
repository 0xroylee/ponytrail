import type { ProjectCreateRequest } from "@/lib/api";
import type {
	ProjectCreateDefaults,
	ProjectFormState,
} from "./projects-panel.types";

export const EMPTY_PROJECT_FORM_STATE: ProjectFormState = {
	name: "",
	externalProjectId: "",
	description: "",
	repoOwner: "",
	repoName: "",
	baseBranch: "main",
	localFolder: "",
	lead: "",
	category: "",
	priority: "",
};

export function buildProjectCreateRequest(
	form: ProjectFormState,
	defaults: ProjectCreateDefaults,
): ProjectCreateRequest {
	const name = form.name.trim();
	if (!name) {
		throw new Error("Project name is required");
	}
	return {
		boardId: defaults.boardId,
		ownerId: defaults.ownerId,
		name,
		externalProjectId: optionalText(form.externalProjectId),
		description: optionalText(form.description),
		repoOwner: optionalText(form.repoOwner),
		repoName: optionalText(form.repoName),
		baseBranch: optionalText(form.baseBranch),
		localFolder: optionalText(form.localFolder),
		lead: optionalText(form.lead),
		category: optionalText(form.category),
		priority: optionalPriority(form.priority),
	};
}

function optionalText(value: string): string | null {
	const trimmed = value.trim();
	return trimmed || null;
}

function optionalPriority(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	const parsed = Number(trimmed);
	if (!Number.isInteger(parsed)) {
		throw new Error("Priority must be an integer");
	}
	return parsed;
}

import type {
	GitHubRepositoryRecord,
	ProjectCreateRequest,
	ProjectUpdateRequest,
	WorkspaceProjectRecord,
} from "@/lib/api";
import type {
	ProjectCreateDefaults,
	ProjectFormRequestPayload,
	ProjectFormState,
	ProjectRepositoryPickerResult,
	ProjectRepositorySelection,
} from "./types/projects-panel.types";

export const DEFAULT_PROJECT_EMOJI = "📁";

export const EMPTY_PROJECT_FORM_STATE: ProjectFormState = {
	name: "",
	emoji: DEFAULT_PROJECT_EMOJI,
	externalProjectId: "",
	description: "",
	repositoryMode: "search",
	selectedRepository: "",
	manualRepository: "",
	originalManualRepository: "",
	repositoryQuery: "",
	repositorySelection: null,
	baseBranch: "",
	localFolder: "",
	lead: "",
	category: "",
	priority: "",
};

export function buildProjectCreateRequest(
	form: ProjectFormState,
	defaults: ProjectCreateDefaults,
	repositories: GitHubRepositoryRecord[] = [],
): ProjectCreateRequest {
	return {
		boardId: defaults.boardId,
		ownerId: defaults.ownerId,
		...buildProjectFormRequestPayload(form, repositories, "main"),
	};
}

export function buildProjectUpdateRequest(
	form: ProjectFormState,
	repositories: GitHubRepositoryRecord[] = [],
): ProjectUpdateRequest {
	return buildProjectFormRequestPayload(
		form,
		repositories,
		resolveUpdateFallbackBranch(form),
	);
}

export function formStateFromProject(
	project: WorkspaceProjectRecord,
): ProjectFormState {
	const hasRepository = Boolean(project.repoOwner && project.repoName);
	const fullName = hasRepository
		? `${project.repoOwner}/${project.repoName}`
		: "";
	return {
		...EMPTY_PROJECT_FORM_STATE,
		name: project.name,
		emoji: project.emoji ?? DEFAULT_PROJECT_EMOJI,
		externalProjectId: project.externalProjectId ?? "",
		description: project.description ?? "",
		selectedRepository: fullName,
		manualRepository: fullName,
		originalManualRepository: fullName,
		repositoryQuery: fullName,
		repositorySelection: hasRepository
			? {
					owner: project.repoOwner ?? "",
					name: project.repoName ?? "",
					fullName,
					defaultBranch: project.baseBranch ?? "main",
				}
			: null,
		baseBranch: project.baseBranch ?? "",
		localFolder: project.localFolder ?? "",
		lead: project.lead ?? "",
		category: project.category ?? "",
		priority: project.priority === null ? "" : String(project.priority),
	};
}

export const buildProjectEditFormState = formStateFromProject;

export function repositorySelectionFromSearchResult(
	result: ProjectRepositoryPickerResult,
): ProjectRepositorySelection {
	return {
		owner: result.owner,
		name: result.name,
		fullName: result.fullName,
		defaultBranch: result.defaultBranch,
	};
}

function buildProjectFormRequestPayload(
	form: ProjectFormState,
	repositories: GitHubRepositoryRecord[],
	fallbackBranch: string,
): ProjectFormRequestPayload {
	const name = form.name.trim();
	if (!name) {
		throw new Error("Project name is required");
	}
	const repository = resolveRepositoryInput(form, repositories, fallbackBranch);
	return {
		name,
		emoji: optionalText(form.emoji) ?? DEFAULT_PROJECT_EMOJI,
		externalProjectId: optionalText(form.externalProjectId),
		description: optionalText(form.description),
		repoOwner: repository?.owner ?? null,
		repoName: repository?.name ?? null,
		baseBranch: repository?.defaultBranch ?? null,
		localFolder: optionalText(form.localFolder),
		lead: optionalText(form.lead),
		category: optionalText(form.category),
		priority: optionalPriority(form.priority),
	};
}

function resolveRepositoryInput(
	form: ProjectFormState,
	repositories: GitHubRepositoryRecord[],
	fallbackBranch: string,
): { owner: string; name: string; defaultBranch: string } | null {
	if (form.repositoryMode === "select") {
		return resolveSelectedRepository(form.selectedRepository, repositories);
	}
	if (form.repositoryMode === "search" && form.repositorySelection) {
		return {
			owner: form.repositorySelection.owner,
			name: form.repositorySelection.name,
			defaultBranch: form.repositorySelection.defaultBranch,
		};
	}
	const rawRepository =
		form.repositoryMode === "manual"
			? form.manualRepository
			: form.repositoryQuery;
	const parsed = parseGitHubRepositoryInput(rawRepository);
	return parsed ? { ...parsed, defaultBranch: fallbackBranch } : null;
}

function resolveSelectedRepository(
	value: string,
	repositories: GitHubRepositoryRecord[],
): { owner: string; name: string; defaultBranch: string } | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const repository = repositories.find(
		(option) => option.nameWithOwner === trimmed,
	);
	if (repository) {
		return {
			owner: repository.owner,
			name: repository.name,
			defaultBranch: repository.defaultBranch ?? "main",
		};
	}
	const parsed = parseGitHubRepositoryInput(trimmed);
	return parsed ? { ...parsed, defaultBranch: "main" } : null;
}

function parseGitHubRepositoryInput(
	value: string,
): { owner: string; name: string } | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const match =
		/^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(trimmed) ??
		/^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(trimmed) ??
		/^ssh:\/\/git@github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(
			trimmed,
		) ??
		/^([^/\s]+)\/([^/\s]+)$/.exec(trimmed);
	if (!match) {
		throw new Error(
			"Repository must be selected from search or entered as owner/repo",
		);
	}
	return { owner: match[1], name: match[2] };
}

function resolveUpdateFallbackBranch(form: ProjectFormState): string {
	const activeRepository =
		form.repositoryMode === "manual"
			? form.manualRepository.trim()
			: form.repositoryQuery.trim();
	if (
		activeRepository &&
		activeRepository === form.originalManualRepository.trim()
	) {
		return optionalText(form.baseBranch) ?? "main";
	}
	return "main";
}

function optionalText(value: string): string | null {
	const trimmed = value.trim();
	return trimmed || null;
}

function optionalPriority(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const parsed = Number(trimmed);
	if (!Number.isInteger(parsed)) {
		throw new Error("Priority must be a whole number");
	}
	return parsed;
}

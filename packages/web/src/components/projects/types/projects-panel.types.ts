import type { WorkspaceProjectRecord } from "@/lib/api";
import type { GitHubConnectionResponse } from "@/lib/api/types/client.types";
import type { GitHubRepositorySearchResult } from "@/lib/api/types/github.types";

export type ProjectRepositoryMode = "select" | "search" | "manual";

export interface ProjectRepositorySelection {
	owner: string;
	name: string;
	fullName: string;
	defaultBranch: string;
}

export interface ProjectFormState {
	name: string;
	emoji: string;
	externalProjectId: string;
	description: string;
	repositoryMode: ProjectRepositoryMode;
	selectedRepository: string;
	manualRepository: string;
	originalManualRepository: string;
	repositoryQuery: string;
	repositorySelection: ProjectRepositorySelection | null;
	baseBranch: string;
	localFolder: string;
	lead: string;
	category: string;
	priority: string;
}

export interface ProjectCreateDefaults {
	boardId: string;
	ownerId: string;
}

export interface ProjectFormRequestPayload {
	name: string;
	emoji: string | null;
	externalProjectId: string | null;
	description: string | null;
	repoOwner: string | null;
	repoName: string | null;
	baseBranch: string | null;
	localFolder: string | null;
	lead: string | null;
	category: string | null;
	priority: number | null;
}

export type ProjectDialogMode = "create" | "edit";
export type ProjectFormFieldName = Exclude<
	keyof ProjectFormState,
	"repositorySelection"
>;

export type ProjectTableDensity = "compact" | "comfortable";

export interface ProjectDisplayRow {
	project: WorkspaceProjectRecord;
	emojiLabel: string;
	priorityLabel: string;
	categoryLabel: string;
	repositoryLabel: string;
	leadLabel: string;
	createdLabel: string;
	summaryLabel: string;
}

export interface RepositorySelectorStateInput {
	connection: GitHubConnectionResponse | undefined;
	hasRepositoryOptions: boolean;
	isConnectionError: boolean;
	isConnectionLoading: boolean;
	isRepositoryLoading: boolean;
	isRepositoryError: boolean;
	repositoryUnavailableReason: string | null;
}

export interface RepositorySelectorState {
	canSelectRepository: boolean;
	shouldShowConnect: boolean;
	shouldShowRetry: boolean;
	statusMessage: string | null;
}

export interface ProjectRepositoryPickerResult
	extends GitHubRepositorySearchResult {}

export interface WorkspaceEnvironmentGitStatus {
	available: boolean;
	branch: string | null;
	dirty: boolean;
	added: number;
	deleted: number;
	untracked: number;
	reason: string | null;
}

export interface WorkspaceEnvironmentMcpSource {
	id: string;
	label: string;
	available: boolean;
	detail: string | null;
}

export interface WorkspaceEnvironmentResponse {
	workspaceId: string;
	projectId: string | null;
	folder: string;
	git: WorkspaceEnvironmentGitStatus;
	mcps: WorkspaceEnvironmentMcpSource[];
}

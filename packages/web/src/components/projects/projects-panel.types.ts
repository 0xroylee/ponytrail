export interface ProjectFormState {
	name: string;
	externalProjectId: string;
	description: string;
	repoOwner: string;
	repoName: string;
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

import type { ResolvedProjectConfig } from "../../types";
import type { IssueProjectRoutingResult } from "../types/workflow.types";

export function routeProjectsForIssueProjectId(
	projects: ResolvedProjectConfig[],
	issueProjectId: string | undefined,
): IssueProjectRoutingResult {
	const scopedProjects = projects.filter((project) => project.id);

	if (!issueProjectId) {
		if (projects.length === 1) {
			return {
				selectedProjectId: projects[0]?.id,
			};
		}
		return {
			skipReason:
				"Target task has no project id and cannot be safely routed in server-projects scope.",
		};
	}

	const explicitMatches = scopedProjects.filter(
		(project) => project.id === issueProjectId,
	);
	if (explicitMatches.length > 1) {
		return {
			error: `Multiple projects are configured with id='${issueProjectId}'. Re-run with --project <PROJECT_ID>.`,
		};
	}
	if (explicitMatches.length === 1) {
		return {
			selectedProjectId: explicitMatches[0]?.id,
		};
	}
	return {
		skipReason: `No project configured for id='${issueProjectId}'.`,
	};
}

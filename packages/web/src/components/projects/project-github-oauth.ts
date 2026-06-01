import { buildGitHubOAuthStartUrl } from "@/lib/api/github-oauth-start";

export function connectGitHubForProjects(): void {
	window.location.assign(
		buildGitHubOAuthStartUrl("/projects", window.location),
	);
}

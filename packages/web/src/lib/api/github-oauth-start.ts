interface GitHubOAuthLocation {
	hostname: string;
	origin: string;
	protocol: string;
}

const GITHUB_OAUTH_START_PATH = "/api/github/oauth/start";

export function buildGitHubOAuthStartUrl(
	returnTo: string,
	location: GitHubOAuthLocation,
): string {
	const origin = normalizeOrigin(location);
	const params = new URLSearchParams({
		returnTo: normalizeReturnTo(returnTo),
		origin,
	});
	const path = `${GITHUB_OAUTH_START_PATH}?${params.toString()}`;
	return isLocalhostHttp(location) ? `${origin}${path}` : path;
}

function normalizeOrigin(location: GitHubOAuthLocation): string {
	if (!isLocalhostHttp(location)) {
		return location.origin;
	}
	const origin = new URL(location.origin);
	origin.hostname = "127.0.0.1";
	return origin.origin;
}

function isLocalhostHttp(location: GitHubOAuthLocation): boolean {
	return location.protocol === "http:" && location.hostname === "localhost";
}

function normalizeReturnTo(returnTo: string): string {
	return returnTo.startsWith("/") && !returnTo.startsWith("//")
		? returnTo
		: "/projects";
}

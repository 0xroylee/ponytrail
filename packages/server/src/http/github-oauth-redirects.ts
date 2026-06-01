const CALLBACK_PATH = "/api/github/oauth/callback";
const DEFAULT_RETURN_TO = "/projects";
const ORIGIN_COOKIE = "devos_github_oauth_origin";
const RETURN_TO_COOKIE = "devos_github_oauth_return_to";
export const STATE_COOKIE = "devos_github_oauth_state";

export interface GitHubOAuthRedirectContext {
	callbackUrl: string;
	origin: string;
	returnTo: string;
}

export function createGitHubOAuthRedirectContext(
	request: Request,
): GitHubOAuthRedirectContext {
	const url = new URL(request.url);
	const origin = resolveOAuthOrigin(url.searchParams.get("origin"), url);
	const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo"));
	return {
		callbackUrl: new URL(CALLBACK_PATH, origin).toString(),
		origin,
		returnTo,
	};
}

export function readStoredGitHubOAuthRedirectContext(
	request: Request,
): GitHubOAuthRedirectContext {
	const requestUrl = new URL(request.url);
	const origin = resolveOAuthOrigin(
		readCookie(request, ORIGIN_COOKIE),
		requestUrl,
	);
	const returnTo = sanitizeReturnTo(readCookie(request, RETURN_TO_COOKIE));
	return {
		callbackUrl: new URL(CALLBACK_PATH, origin).toString(),
		origin,
		returnTo,
	};
}

export function readCookie(request: Request, name: string): string | null {
	const encoded = request.headers
		.get("cookie")
		?.split(";")
		.map((cookie) => cookie.trim())
		.find((cookie) => cookie.startsWith(`${name}=`))
		?.slice(name.length + 1);
	if (!encoded) return null;
	try {
		return decodeURIComponent(encoded);
	} catch {
		return null;
	}
}

export function redirect(
	location: string,
	cookies: string | string[],
): Response {
	const headers = new Headers({ location });
	for (const cookie of Array.isArray(cookies) ? cookies : [cookies]) {
		headers.append("set-cookie", cookie);
	}
	return new Response(null, { status: 302, headers });
}

export function stateCookie(state: string, maxAge: number): string {
	return cookie(STATE_COOKIE, state, maxAge);
}

export function startRedirectCookies(
	state: string,
	context: GitHubOAuthRedirectContext,
): string[] {
	return [
		stateCookie(state, 600),
		cookie(RETURN_TO_COOKIE, context.returnTo, 600),
		cookie(ORIGIN_COOKIE, context.origin, 600),
	];
}

export function clearRedirectCookies(): string[] {
	return [
		stateCookie("", 0),
		cookie(RETURN_TO_COOKIE, "", 0),
		cookie(ORIGIN_COOKIE, "", 0),
	];
}

export function oauthRedirect(
	request: Request,
	result: "connected" | "error",
): Response {
	const context = readStoredGitHubOAuthRedirectContext(request);
	const location = new URL(context.returnTo, context.origin);
	location.searchParams.set("github", result);
	return redirect(location.toString(), clearRedirectCookies());
}

function resolveOAuthOrigin(value: string | null, requestUrl: URL): string {
	if (value) {
		const parsed = parseOrigin(value);
		if (parsed && isLoopbackHost(parsed.hostname)) {
			return normalizeLoopbackOrigin(parsed);
		}
	}
	return requestUrl.origin;
}

function parseOrigin(value: string): URL | null {
	try {
		const parsed = new URL(value);
		if (parsed.protocol === "http:" || parsed.protocol === "https:") {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
}

function normalizeLoopbackOrigin(url: URL): string {
	if (url.hostname === "localhost") {
		url.hostname = "127.0.0.1";
	}
	return url.origin;
}

function isLoopbackHost(hostname: string): boolean {
	return (
		hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
	);
}

function sanitizeReturnTo(value: string | null): string {
	if (!value || !value.startsWith("/") || value.startsWith("//")) {
		return DEFAULT_RETURN_TO;
	}
	return value;
}

function cookie(name: string, value: string, maxAge: number): string {
	return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/api/github/oauth; Max-Age=${maxAge}`;
}

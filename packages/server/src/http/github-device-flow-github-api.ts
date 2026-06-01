import { githubHeaders, value } from "./github-oauth-config";

const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";
const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

export interface GitHubDeviceCode {
	deviceCode: string;
	userCode: string;
	verificationUri: string;
	expiresIn: number;
	interval: number;
}

export async function requestDeviceCode(
	fetchFn: typeof fetch,
	clientId: string,
): Promise<GitHubDeviceCode> {
	const payload = await fetchJson(fetchFn, DEVICE_CODE_URL, {
		method: "POST",
		headers: jsonHeaders(),
		body: JSON.stringify({ client_id: clientId, scope: "repo" }),
	});
	const deviceCode = value(payload.device_code);
	const userCode = value(payload.user_code);
	const verificationUri = value(payload.verification_uri);
	const expiresIn = readNumber(payload.expires_in);
	const interval = readNumber(payload.interval);
	if (!deviceCode || !userCode || !verificationUri || !expiresIn || !interval) {
		throw new Error("Invalid GitHub device response");
	}
	return { deviceCode, userCode, verificationUri, expiresIn, interval };
}

export function pollDeviceCode(
	fetchFn: typeof fetch,
	clientId: string,
	deviceCode: string,
): Promise<Record<string, unknown>> {
	return fetchJson(fetchFn, ACCESS_TOKEN_URL, {
		method: "POST",
		headers: jsonHeaders(),
		body: JSON.stringify({
			client_id: clientId,
			device_code: deviceCode,
			grant_type: GRANT_TYPE,
		}),
	});
}

export async function fetchGitHubLogin(
	fetchFn: typeof fetch,
	token: string,
): Promise<string> {
	const payload = await fetchJson(fetchFn, USER_URL, {
		headers: githubHeaders(token),
	});
	const login = value(payload.login);
	if (!login) throw new Error("GitHub user fetch failed");
	return login;
}

export function readNumber(input: unknown): number | null {
	return typeof input === "number" && Number.isFinite(input) ? input : null;
}

async function fetchJson(
	fetchFn: typeof fetch,
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Record<string, unknown>> {
	const response = await fetchFn(input, init);
	const payload = (await response.json()) as unknown;
	if (!response.ok && !isRecord(payload))
		throw new Error("GitHub request failed");
	if (!isRecord(payload)) throw new Error("Invalid GitHub response");
	return payload;
}

function jsonHeaders(): Record<string, string> {
	return { accept: "application/json", "content-type": "application/json" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

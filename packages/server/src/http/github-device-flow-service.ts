import { loadSqliteEnv, saveSqliteEnv } from "devos/features/config";
import {
	clearDeviceCodeCookie,
	deviceCodeCookie,
	readDeviceCodeCookie,
} from "./github-device-flow-cookies";
import {
	type GitHubDeviceCode,
	fetchGitHubLogin,
	pollDeviceCode,
	readNumber,
	requestDeviceCode,
} from "./github-device-flow-github-api";
import {
	CLIENT_ID_KEY,
	LOGIN_KEY,
	TOKEN_KEY,
	connectionResponse,
	readDeviceConfig,
	readStoredConnection,
	value,
} from "./github-oauth-config";
import { badRequest } from "./http-utils";
import type {
	GitHubDevicePollResponse,
	GitHubDeviceStartResponse,
	GitHubRepositoriesRouteDeps,
} from "./types/github-repositories-api.types";

type RouteDeps = {
	env: Record<string, string | undefined>;
	fetchFn: typeof fetch;
	loadEnv: (cwd: string) => Promise<Record<string, string> | undefined>;
	saveEnv: (
		cwd: string,
		updates: Record<string, string | undefined>,
	) => Promise<void>;
};

export async function startGitHubDeviceFlow(
	request: Request,
	workspacePath: string,
	deps: GitHubRepositoriesRouteDeps,
): Promise<Response> {
	const resolved = resolveDeps(deps);
	const body = await readStartBody(request);
	if (!body.ok) return badRequest(body.error);
	const store = await resolved.loadEnv(workspacePath);
	const clientId = value(body.value.clientId);
	const config = clientId
		? { clientId }
		: readDeviceConfig(resolved.env, store);
	if (!config) return badRequest("GitHub client id is required");
	if (clientId)
		await resolved.saveEnv(workspacePath, { [CLIENT_ID_KEY]: clientId });
	const device = await requestDeviceCode(resolved.fetchFn, config.clientId);
	return deviceStartResponse(device);
}

export async function pollGitHubDeviceFlow(
	request: Request,
	workspacePath: string,
	deps: GitHubRepositoriesRouteDeps,
): Promise<Response> {
	const deviceCode = readDeviceCodeCookie(request);
	if (!deviceCode) return badRequest("GitHub device flow has not been started");
	const resolved = resolveDeps(deps);
	const store = await resolved.loadEnv(workspacePath);
	const config = readDeviceConfig(resolved.env, store);
	if (!config) return badRequest("GitHub client id is required");
	const payload = await pollDeviceCode(
		resolved.fetchFn,
		config.clientId,
		deviceCode,
	);
	const token = value(payload.access_token);
	if (!token) return Response.json(devicePollStatus(payload));
	const login = await fetchGitHubLogin(resolved.fetchFn, token);
	await resolved.saveEnv(workspacePath, {
		[TOKEN_KEY]: token,
		[LOGIN_KEY]: login,
	});
	const response = Response.json({
		status: "connected",
		interval: null,
		connection: connectionResponse(config, { login, token }),
		message: null,
	} satisfies GitHubDevicePollResponse);
	response.headers.append("set-cookie", clearDeviceCodeCookie());
	return response;
}

async function readStartBody(
	request: Request,
): Promise<
	{ ok: true; value: { clientId?: unknown } } | { ok: false; error: string }
> {
	const text = await request.text();
	if (!text.trim()) return { ok: true, value: {} };
	try {
		const payload = JSON.parse(text) as unknown;
		if (!isRecord(payload))
			return { ok: false, error: "Malformed request body" };
		return { ok: true, value: payload };
	} catch {
		return { ok: false, error: "Malformed JSON body" };
	}
}

function deviceStartResponse(device: GitHubDeviceCode): Response {
	const body: GitHubDeviceStartResponse = {
		userCode: device.userCode,
		verificationUri: device.verificationUri,
		expiresIn: device.expiresIn,
		interval: device.interval,
	};
	const response = Response.json(body);
	response.headers.append(
		"set-cookie",
		deviceCodeCookie(device.deviceCode, device.expiresIn),
	);
	return response;
}

function devicePollStatus(
	payload: Record<string, unknown>,
): GitHubDevicePollResponse {
	const error = value(payload.error);
	if (error === "authorization_pending") {
		return status(
			"pending",
			readNumber(payload.interval) ?? 5,
			"Waiting for GitHub authorization",
		);
	}
	if (error === "slow_down") {
		return status(
			"slow_down",
			readNumber(payload.interval) ?? 10,
			"GitHub asked us to slow down",
		);
	}
	if (error === "expired_token" || error === "token_expired") {
		return status("expired", null, "GitHub device code expired");
	}
	if (error === "access_denied") {
		return status("denied", null, "GitHub authorization was cancelled");
	}
	return status("error", null, "GitHub device authorization failed");
}

function status(
	status: GitHubDevicePollResponse["status"],
	interval: number | null,
	message: string,
): GitHubDevicePollResponse {
	return { status, interval, connection: null, message };
}

function resolveDeps(deps: GitHubRepositoriesRouteDeps): RouteDeps {
	return {
		env: deps.env ?? process.env,
		fetchFn: deps.fetchFn ?? fetch,
		loadEnv: deps.loadEnv ?? loadSqliteEnv,
		saveEnv: deps.saveEnv ?? saveSqliteEnv,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

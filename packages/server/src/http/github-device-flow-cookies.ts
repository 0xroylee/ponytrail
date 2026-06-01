import { value } from "./github-oauth-config";
import { readCookie } from "./github-oauth-redirects";

const DEVICE_CODE_COOKIE = "devos_github_device_code";
const DEVICE_CODE_PATH = "/api/github/device";

export function readDeviceCodeCookie(request: Request): string | null {
	return value(readCookie(request, DEVICE_CODE_COOKIE));
}

export function deviceCodeCookie(deviceCode: string, maxAge: number): string {
	return `${DEVICE_CODE_COOKIE}=${encodeURIComponent(deviceCode)}; HttpOnly; SameSite=Lax; Path=${DEVICE_CODE_PATH}; Max-Age=${maxAge}`;
}

export function clearDeviceCodeCookie(): string {
	return `${DEVICE_CODE_COOKIE}=; HttpOnly; SameSite=Lax; Path=${DEVICE_CODE_PATH}; Max-Age=0`;
}

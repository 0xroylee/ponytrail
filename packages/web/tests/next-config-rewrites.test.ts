import { describe, expect, it } from "bun:test";
import nextConfig from "../next.config";

const DEFAULT_SERVER_BASE_URL = "http://127.0.0.1:3001";

describe("Next.js rewrites", () => {
	it("proxies server docs routes through the web origin", async () => {
		const rewrites = await readRewriteRules();

		expect(rewrites).toContainEqual({
			source: "/api-docs",
			destination: `${DEFAULT_SERVER_BASE_URL}/api-docs`,
		});
		expect(rewrites).toContainEqual({
			source: "/api-docs/:path*",
			destination: `${DEFAULT_SERVER_BASE_URL}/api-docs/:path*`,
		});
		expect(rewrites).toContainEqual({
			source: "/openapi",
			destination: `${DEFAULT_SERVER_BASE_URL}/openapi`,
		});
		expect(rewrites).toContainEqual({
			source: "/openapi/:path*",
			destination: `${DEFAULT_SERVER_BASE_URL}/openapi/:path*`,
		});
		expect(rewrites).toContainEqual({
			source: "/openapi.yaml",
			destination: `${DEFAULT_SERVER_BASE_URL}/openapi.yaml`,
		});
	});

	it("keeps existing API and health proxies", async () => {
		const rewrites = await readRewriteRules();

		expect(rewrites).toContainEqual({
			source: "/api/:path*",
			destination: `${DEFAULT_SERVER_BASE_URL}/api/:path*`,
		});
		expect(rewrites).toContainEqual({
			source: "/health",
			destination: `${DEFAULT_SERVER_BASE_URL}/health`,
		});
	});
});

async function readRewriteRules(): Promise<RewriteRule[]> {
	const rewrites = (nextConfig as NextConfigWithRewrites).rewrites;
	if (!rewrites) {
		throw new Error("Expected Next.js rewrites to be configured");
	}
	const result = await rewrites();
	if (Array.isArray(result)) {
		return result;
	}
	return [
		...(result.beforeFiles ?? []),
		...(result.afterFiles ?? []),
		...(result.fallback ?? []),
	];
}

interface NextConfigWithRewrites {
	rewrites?: () => Promise<RewriteRules>;
}

interface RewriteRule {
	source: string;
	destination: string;
}

interface StructuredRewriteRules {
	beforeFiles?: RewriteRule[];
	afterFiles?: RewriteRule[];
	fallback?: RewriteRule[];
}

type RewriteRules = RewriteRule[] | StructuredRewriteRules;

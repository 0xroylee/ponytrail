import { describe, expect, it } from "bun:test";
import { buildGitHubOAuthStartUrl } from "../src/lib/api/github-oauth-start";

describe("GitHub OAuth start URL", () => {
	it("normalizes localhost browser origins to 127.0.0.1 before OAuth", () => {
		expect(
			buildGitHubOAuthStartUrl("/integrations", {
				origin: "http://localhost:3100",
				hostname: "localhost",
				protocol: "http:",
			}),
		).toBe(
			"http://127.0.0.1:3100/api/github/oauth/start?returnTo=%2Fintegrations&origin=http%3A%2F%2F127.0.0.1%3A3100",
		);
	});

	it("uses a relative start URL outside localhost browsers", () => {
		expect(
			buildGitHubOAuthStartUrl("/projects", {
				origin: "https://devos.example",
				hostname: "devos.example",
				protocol: "https:",
			}),
		).toBe(
			"/api/github/oauth/start?returnTo=%2Fprojects&origin=https%3A%2F%2Fdevos.example",
		);
	});
});

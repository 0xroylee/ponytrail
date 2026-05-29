import { describe, expect, it } from "bun:test";
import { createRouteDispatcher } from "../src/http/route-registry";

describe("route registry", () => {
	it("returns the first route response and skips later handlers", async () => {
		const calls: string[] = [];
		const handler = createRouteDispatcher([
			{
				name: "miss",
				handle: () => {
					calls.push("miss");
					return null;
				},
			},
			{
				name: "hit",
				handle: () => {
					calls.push("hit");
					return Response.json({ route: "hit" });
				},
			},
			{
				name: "after-hit",
				handle: () => {
					calls.push("after-hit");
					return Response.json({ route: "after-hit" });
				},
			},
		]);

		const response = await handler(new Request("http://localhost/api/test"));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ route: "hit" });
		expect(calls).toEqual(["miss", "hit"]);
	});

	it("returns the fallback response when no route handles the request", async () => {
		const handler = createRouteDispatcher(
			[
				{
					name: "miss",
					handle: () => null,
				},
			],
			() => new Response("fallback", { status: 418 }),
		);

		const response = await handler(new Request("http://localhost/api/missing"));

		expect(response.status).toBe(418);
		expect(await response.text()).toBe("fallback");
	});
});

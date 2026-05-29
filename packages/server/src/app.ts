import { createAppRoutes, createHealthRoutes } from "./http/app-routes";
import { createRouteDispatcher } from "./http/route-registry";
import type { AppDeps, RouteHandler } from "./types/app.types";

export function createHandleRequest(deps: AppDeps): RouteHandler {
	return createRouteDispatcher(createAppRoutes(deps));
}

export const handleRequest: RouteHandler = createRouteDispatcher(
	createHealthRoutes(),
);

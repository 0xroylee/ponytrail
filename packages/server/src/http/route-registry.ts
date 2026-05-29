import { notFoundResponse } from "./response";
import type {
	RouteFallbackHandler,
	RouteRegistryEntry,
} from "./types/route-registry.types";

const defaultFallback: RouteFallbackHandler = () => notFoundResponse();

export function createRouteDispatcher(
	routes: RouteRegistryEntry[],
	fallback: RouteFallbackHandler = defaultFallback,
): RouteFallbackHandler {
	return async (request) => {
		const context = { pathname: new URL(request.url).pathname };
		for (const route of routes) {
			const response = await route.handle(request, context);
			if (response) {
				return response;
			}
		}
		return fallback(request);
	};
}

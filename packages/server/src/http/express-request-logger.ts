import type {
	Request as ExpressRequest,
	Response as ExpressResponse,
} from "express";
import pinoHttp from "pino-http";
import type { ServerLogger } from "../logger.types";

export function createExpressRequestLogger(logger: ServerLogger) {
	return pinoHttp<ExpressRequest, ExpressResponse>({
		customAttributeKeys: { responseTime: "durationMs" },
		customErrorMessage: () => "HTTP request failed",
		customErrorObject: (request, response, _error, value) => ({
			durationMs: value.durationMs,
			err: value.err,
			method: request.method,
			path: resolveRequestPath(request),
			statusCode: response.statusCode,
		}),
		customLogLevel: (_request, response, error) =>
			error || response.statusCode >= 500 ? "error" : "info",
		customSuccessMessage: () => "HTTP request completed",
		customSuccessObject: (request, response, value) => ({
			durationMs: value.durationMs,
			method: request.method,
			path: resolveRequestPath(request),
			statusCode: response.statusCode,
		}),
		logger,
		serializers: {
			req: (request) => ({
				method: request.method,
				path: resolveRequestPath(request),
			}),
			res: (response) => ({ statusCode: response.statusCode }),
		},
	});
}

function resolveRequestPath(request: ExpressRequest): string {
	if (typeof request.path === "string") {
		return request.path;
	}
	const rawUrl = request.originalUrl || request.url || "/";
	return rawUrl.split("?")[0] || "/";
}

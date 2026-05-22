import type { HttpLogger } from "pino-http";

export type ServerLogContext = Record<string, unknown>;

export type ServerLogger = HttpLogger["logger"];

export interface ServerLoggerOptions {
	context?: ServerLogContext;
	env?: { PIV_LOG_LEVEL?: string };
	destination?: string | number | NodeJS.WritableStream;
	color?: boolean;
	sync?: boolean;
}

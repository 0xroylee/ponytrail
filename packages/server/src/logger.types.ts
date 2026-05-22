import type { Logger as PinoLogger } from "pino";

export type ServerLogContext = Record<string, unknown>;

export type ServerLogger = PinoLogger;

export interface ServerLoggerOptions {
	context?: ServerLogContext;
	env?: { PIV_LOG_LEVEL?: string };
	destination?: string | number | NodeJS.WritableStream;
	color?: boolean;
	sync?: boolean;
}

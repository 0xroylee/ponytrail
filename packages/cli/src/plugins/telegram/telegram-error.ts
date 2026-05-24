import type { TelegramApiErrorOptions } from "./types/telegram.types";

export class TelegramApiError extends Error {
	readonly method: string;
	readonly status?: number;
	readonly errorCode?: number;
	readonly description?: string;

	constructor(options: TelegramApiErrorOptions) {
		const details = [
			`Telegram API ${options.method} failed`,
			options.status === undefined ? undefined : `status ${options.status}`,
			options.errorCode === undefined
				? undefined
				: `error ${options.errorCode}`,
			options.description,
		]
			.filter(Boolean)
			.join(": ");
		super(details);
		this.name = "TelegramApiError";
		this.method = options.method;
		this.status = options.status;
		this.errorCode = options.errorCode;
		this.description = options.description;
	}
}

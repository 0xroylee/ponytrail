import type {
	TelegramBotIdentity,
	TelegramReceivedMessage,
	TelegramSentMessage,
} from "./types/telegram.types";

export interface TelegramUserPayload {
	id: number;
	is_bot: boolean;
	first_name: string;
	username?: string;
}

export interface TelegramChatPayload {
	id: number | string;
	type?: string;
}

export interface TelegramMessagePayload {
	message_id: number;
	chat: TelegramChatPayload;
	text?: string;
	message_thread_id?: number;
	date?: number;
	from?: {
		id: number;
		username?: string;
		first_name?: string;
	};
}

export interface TelegramUpdatePayload {
	update_id: number;
	message?: TelegramMessagePayload;
}

export function toBotIdentity(
	payload: TelegramUserPayload,
): TelegramBotIdentity {
	return {
		id: payload.id,
		isBot: payload.is_bot,
		firstName: payload.first_name,
		username: payload.username,
	};
}

export function toSentMessage(
	payload: TelegramMessagePayload,
): TelegramSentMessage {
	return {
		messageId: payload.message_id,
		chatId: payload.chat.id,
		text: payload.text,
		messageThreadId: payload.message_thread_id,
		date: payload.date,
	};
}

export function toReceivedMessage(
	update: TelegramUpdatePayload,
): TelegramReceivedMessage | undefined {
	if (!update.message) {
		return undefined;
	}
	return {
		updateId: update.update_id,
		messageId: update.message.message_id,
		chatId: update.message.chat.id,
		chatType: update.message.chat.type,
		text: update.message.text,
		from: update.message.from
			? {
					id: update.message.from.id,
					username: update.message.from.username,
					firstName: update.message.from.first_name,
				}
			: undefined,
		messageThreadId: update.message.message_thread_id,
		date: update.message.date,
	};
}

export function resolveNextOffset(
	updates: TelegramUpdatePayload[],
): number | undefined {
	const lastUpdateId = updates.reduce<number | undefined>(
		(current, update) =>
			current === undefined || update.update_id > current
				? update.update_id
				: current,
		undefined,
	);
	return lastUpdateId === undefined ? undefined : lastUpdateId + 1;
}

import { TelegramApiError } from "./telegram-error";
import {
	type TelegramMessagePayload,
	type TelegramUpdatePayload,
	type TelegramUserPayload,
	resolveNextOffset,
	toBotIdentity,
	toReceivedMessage,
	toSentMessage,
} from "./telegram-mappers";
import type {
	TelegramApiResponse,
	TelegramClient,
	TelegramClientConfig,
	TelegramConnectivityCheckInput,
	TelegramConnectivityCheckResult,
	TelegramReceiveMessagesInput,
	TelegramReceivedMessage,
	TelegramReceivedMessageBatch,
	TelegramSendMessageInput,
	TelegramSentMessage,
} from "./telegram.types";

const DEFAULT_API_BASE_URL = "https://api.telegram.org";

export function createTelegramClient(
	config: TelegramClientConfig,
): TelegramClient {
	const botToken = normalizeBotToken(config.botToken);
	const apiBaseUrl = normalizeApiBaseUrl(config.apiBaseUrl);
	const fetchImpl = config.fetchImpl ?? fetch;

	return {
		testConnection: () =>
			callTelegram<TelegramUserPayload>({
				apiBaseUrl,
				botToken,
				fetchImpl,
				method: "getMe",
			}).then(toBotIdentity),
		sendMessage: (input) =>
			sendTelegramMessage({ apiBaseUrl, botToken, fetchImpl }, input),
		receiveMessages: (input = {}) =>
			receiveTelegramMessages({ apiBaseUrl, botToken, fetchImpl }, input),
		runConnectivityCheck: async (input) =>
			runTelegramConnectivityCheck({ apiBaseUrl, botToken, fetchImpl }, input),
	};
}

async function sendTelegramMessage(
	client: TelegramRuntimeClient,
	input: TelegramSendMessageInput,
): Promise<TelegramSentMessage> {
	const result = await callTelegram<TelegramMessagePayload>({
		...client,
		method: "sendMessage",
		body: {
			chat_id: input.chatId,
			text: input.text,
			...(input.messageThreadId === undefined
				? {}
				: { message_thread_id: input.messageThreadId }),
		},
	});
	return toSentMessage(result);
}

async function receiveTelegramMessages(
	client: TelegramRuntimeClient,
	input: TelegramReceiveMessagesInput,
): Promise<TelegramReceivedMessageBatch> {
	const result = await callTelegram<TelegramUpdatePayload[]>({
		...client,
		method: "getUpdates",
		body: {
			...(input.offset === undefined ? {} : { offset: input.offset }),
			...(input.timeoutSeconds === undefined
				? {}
				: { timeout: input.timeoutSeconds }),
			...(input.limit === undefined ? {} : { limit: input.limit }),
			...(input.allowedUpdates === undefined
				? {}
				: { allowed_updates: input.allowedUpdates }),
		},
	});
	const nextOffset = resolveNextOffset(result);
	return {
		messages: result
			.map(toReceivedMessage)
			.filter((message): message is TelegramReceivedMessage =>
				Boolean(message),
			),
		...(nextOffset === undefined ? {} : { nextOffset }),
	};
}

async function runTelegramConnectivityCheck(
	client: TelegramRuntimeClient,
	input: TelegramConnectivityCheckInput,
): Promise<TelegramConnectivityCheckResult> {
	const sent = await sendTelegramMessage(client, {
		chatId: input.chatId,
		text: input.testText,
		messageThreadId: input.messageThreadId,
	});
	const received = await receiveTelegramMessages(client, {
		timeoutSeconds: input.receiveTimeoutSeconds ?? 10,
		allowedUpdates: ["message"],
	});
	return {
		sent,
		received: received.messages,
		sendSucceeded: true,
		receiveSucceeded: received.messages.length > 0,
		...(received.nextOffset === undefined
			? {}
			: { nextOffset: received.nextOffset }),
	};
}

interface TelegramRuntimeClient {
	apiBaseUrl: string;
	botToken: string;
	fetchImpl: typeof fetch;
}

async function callTelegram<T>(
	input: TelegramRuntimeClient & {
		method: string;
		body?: Record<string, unknown>;
	},
): Promise<T> {
	const response = await input.fetchImpl(
		buildTelegramMethodUrl(input.apiBaseUrl, input.botToken, input.method),
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(input.body ?? {}),
		},
	);
	const payload = (await response.json().catch(() => undefined)) as
		| TelegramApiResponse<T>
		| undefined;
	if (!response.ok || !payload?.ok) {
		throw new TelegramApiError({
			method: input.method,
			status: response.status,
			errorCode: payload?.error_code,
			description: payload?.description ?? response.statusText,
		});
	}
	if (payload.result === undefined) {
		throw new TelegramApiError({
			method: input.method,
			status: response.status,
			description: "Missing result in Telegram API response",
		});
	}
	return payload.result;
}

function buildTelegramMethodUrl(
	apiBaseUrl: string,
	botToken: string,
	method: string,
): string {
	return `${apiBaseUrl}/bot${encodeURIComponent(botToken)}/${method}`;
}

function normalizeBotToken(botToken: string): string {
	const normalized = botToken.trim();
	if (!normalized) {
		throw new Error("Telegram bot token is required");
	}
	return normalized;
}

function normalizeApiBaseUrl(apiBaseUrl?: string): string {
	return (apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

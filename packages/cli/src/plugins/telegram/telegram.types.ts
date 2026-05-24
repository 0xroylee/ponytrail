export type TelegramChatId = number | string;

export interface TelegramClientConfig {
	botToken: string;
	apiBaseUrl?: string;
	fetchImpl?: typeof fetch;
}

export interface TelegramBotIdentity {
	id: number;
	isBot: boolean;
	firstName: string;
	username?: string;
}

export interface TelegramSendMessageInput {
	chatId: TelegramChatId;
	text: string;
	messageThreadId?: number;
}

export interface TelegramSentMessage {
	messageId: number;
	chatId: TelegramChatId;
	text?: string;
	messageThreadId?: number;
	date?: number;
}

export interface TelegramReceiveMessagesInput {
	offset?: number;
	timeoutSeconds?: number;
	limit?: number;
	allowedUpdates?: string[];
}

export interface TelegramReceivedMessage {
	updateId: number;
	messageId: number;
	chatId: TelegramChatId;
	chatType?: string;
	text?: string;
	from?: {
		id: number;
		username?: string;
		firstName?: string;
	};
	messageThreadId?: number;
	date?: number;
}

export interface TelegramReceivedMessageBatch {
	messages: TelegramReceivedMessage[];
	nextOffset?: number;
}

export interface TelegramConnectivityCheckInput {
	chatId: TelegramChatId;
	testText: string;
	messageThreadId?: number;
	receiveTimeoutSeconds?: number;
}

export interface TelegramConnectivityCheckResult {
	sent: TelegramSentMessage;
	received: TelegramReceivedMessage[];
	sendSucceeded: boolean;
	receiveSucceeded: boolean;
	nextOffset?: number;
}

export interface TelegramClient {
	testConnection(): Promise<TelegramBotIdentity>;
	sendMessage(input: TelegramSendMessageInput): Promise<TelegramSentMessage>;
	receiveMessages(
		input?: TelegramReceiveMessagesInput,
	): Promise<TelegramReceivedMessageBatch>;
	runConnectivityCheck(
		input: TelegramConnectivityCheckInput,
	): Promise<TelegramConnectivityCheckResult>;
}

export interface TelegramApiErrorOptions {
	method: string;
	status?: number;
	errorCode?: number;
	description?: string;
}

export interface TelegramApiResponse<T> {
	ok: boolean;
	result?: T;
	error_code?: number;
	description?: string;
}

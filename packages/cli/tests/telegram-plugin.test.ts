import { describe, expect, it } from "bun:test";
import {
	TelegramApiError,
	createTelegramClient,
} from "../src/plugins/telegram";
import { type FetchCall, createFetchMock } from "./telegram-test-helpers";

describe("telegram plugin client", () => {
	it("checks bot authentication with getMe", async () => {
		const calls: FetchCall[] = [];
		const client = createTelegramClient({
			botToken: "123:secret",
			fetchImpl: createFetchMock(calls, [
				{
					ok: true,
					result: {
						id: 123,
						is_bot: true,
						first_name: "Devos",
						username: "devos_bot",
					},
				},
			]),
		});

		await expect(client.testConnection()).resolves.toEqual({
			id: 123,
			isBot: true,
			firstName: "Devos",
			username: "devos_bot",
		});
		expect(calls[0]?.url).toBe(
			"https://api.telegram.org/bot123%3Asecret/getMe",
		);
		expect(calls[0]?.body).toEqual({});
	});

	it("sends messages with optional thread id", async () => {
		const calls: FetchCall[] = [];
		const client = createTelegramClient({
			botToken: "123:secret",
			fetchImpl: createFetchMock(calls, [
				{
					ok: true,
					result: {
						message_id: 77,
						chat: { id: -1001, type: "supergroup" },
						text: "hello",
						message_thread_id: 12,
						date: 1770000000,
					},
				},
			]),
		});

		await expect(
			client.sendMessage({
				chatId: -1001,
				text: "hello",
				messageThreadId: 12,
			}),
		).resolves.toEqual({
			messageId: 77,
			chatId: -1001,
			text: "hello",
			messageThreadId: 12,
			date: 1770000000,
		});
		expect(calls[0]?.url).toBe(
			"https://api.telegram.org/bot123%3Asecret/sendMessage",
		);
		expect(calls[0]?.body).toEqual({
			chat_id: -1001,
			text: "hello",
			message_thread_id: 12,
		});
	});

	it("receives and normalizes message updates", async () => {
		const calls: FetchCall[] = [];
		const client = createTelegramClient({
			botToken: "123:secret",
			fetchImpl: createFetchMock(calls, [
				{
					ok: true,
					result: [
						{ update_id: 10, callback_query: { id: "ignored" } },
						{
							update_id: 11,
							message: {
								message_id: 5,
								chat: { id: 42, type: "private" },
								text: "ping",
								date: 1770000001,
								from: {
									id: 42,
									username: "john",
									first_name: "John",
								},
							},
						},
					],
				},
			]),
		});

		await expect(
			client.receiveMessages({
				offset: 9,
				timeoutSeconds: 1,
				limit: 2,
				allowedUpdates: ["message"],
			}),
		).resolves.toEqual({
			messages: [
				{
					updateId: 11,
					messageId: 5,
					chatId: 42,
					chatType: "private",
					text: "ping",
					date: 1770000001,
					from: {
						id: 42,
						username: "john",
						firstName: "John",
					},
				},
			],
			nextOffset: 12,
		});
		expect(calls[0]?.body).toEqual({
			offset: 9,
			timeout: 1,
			limit: 2,
			allowed_updates: ["message"],
		});
	});

	it("runs send then receive connectivity check", async () => {
		const calls: FetchCall[] = [];
		const client = createTelegramClient({
			botToken: "123:secret",
			fetchImpl: createFetchMock(calls, [
				{
					ok: true,
					result: {
						message_id: 7,
						chat: { id: "devos-chat", type: "group" },
						text: "test",
					},
				},
				{
					ok: true,
					result: [
						{
							update_id: 21,
							message: {
								message_id: 8,
								chat: { id: "devos-chat", type: "group" },
								text: "reply",
								message_thread_id: 3,
							},
						},
					],
				},
			]),
		});

		await expect(
			client.runConnectivityCheck({
				chatId: "devos-chat",
				testText: "test",
				messageThreadId: 3,
				receiveTimeoutSeconds: 2,
			}),
		).resolves.toEqual({
			sent: {
				messageId: 7,
				chatId: "devos-chat",
				text: "test",
			},
			received: [
				{
					updateId: 21,
					messageId: 8,
					chatId: "devos-chat",
					chatType: "group",
					text: "reply",
					messageThreadId: 3,
				},
			],
			sendSucceeded: true,
			receiveSucceeded: true,
			nextOffset: 22,
		});
		expect(
			calls.map((call) => {
				const parts = call.url.split("/");
				return parts[parts.length - 1];
			}),
		).toEqual(["sendMessage", "getUpdates"]);
		expect(calls[1]?.body).toEqual({
			timeout: 2,
			allowed_updates: ["message"],
		});
	});

	it("throws sanitized errors for Telegram failures", async () => {
		const client = createTelegramClient({
			botToken: "123:secret-token",
			fetchImpl: createFetchMock(
				[],
				[
					{
						ok: false,
						error_code: 401,
						description: "Unauthorized",
					},
				],
			),
		});

		await expect(client.testConnection()).rejects.toThrow(TelegramApiError);
		await expect(client.testConnection()).rejects.not.toThrow("secret-token");
	});

	it("throws sanitized errors for HTTP failures", async () => {
		const client = createTelegramClient({
			botToken: "123:secret-token",
			fetchImpl: createFetchMock(
				[],
				[{ ok: false, description: "Bad Gateway" }],
				{ status: 502, statusText: "Bad Gateway" },
			),
		});

		await expect(client.testConnection()).rejects.toThrow(
			"Telegram API getMe failed: status 502: Bad Gateway",
		);
		await expect(client.testConnection()).rejects.not.toThrow("secret-token");
	});
});

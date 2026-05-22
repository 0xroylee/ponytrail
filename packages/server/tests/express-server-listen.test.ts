import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import { type Server, createServer } from "node:http";
import { Writable } from "node:stream";
import express, { type Express } from "express";
import request from "supertest";
import {
	createExpressRequestLogger,
	listenExpressApp,
	sendWebResponse,
} from "../src/express-server";
import { createServerLogger } from "../src/logger";

describe("listenExpressApp", () => {
	it("uses the requested fixed port when non-zero", async () => {
		const calls: number[] = [];
		const app = createFakeExpress((port, server) => {
			calls.push(port);
			queueMicrotask(() => server.emit("listening"));
		});

		await listenExpressApp(app, 3300);
		expect(calls).toEqual([3300]);
	});

	it("rejects bind errors without retrying", async () => {
		const calls: number[] = [];
		const error = Object.assign(new Error("in use"), {
			code: "EADDRINUSE",
		});
		const app = createFakeExpress((port, server) => {
			calls.push(port);
			queueMicrotask(() => server.emit("error", error));
		});

		await expect(listenExpressApp(app, 0)).rejects.toBe(error);
		expect(calls).toEqual([0]);
	});

	it("forwards streamed web response chunks before the body closes", async () => {
		const encoder = new TextEncoder();
		let sendSecondChunk: (() => void) | undefined;
		const writes: string[] = [];
		const response = {
			statusCode: 0,
			headers: {} as Record<string, string>,
			status(code: number) {
				this.statusCode = code;
				return this;
			},
			setHeader(key: string, value: string) {
				this.headers[key] = value;
			},
			write(chunk: Buffer) {
				writes.push(chunk.toString());
				return true;
			},
			end() {
				writes.push("[end]");
			},
		};
		const webResponse = new Response(
			new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(encoder.encode("first"));
					sendSecondChunk = () => {
						controller.enqueue(encoder.encode("second"));
						controller.close();
					};
				},
			}),
			{ headers: { "content-type": "text/plain" } },
		);

		const sendPromise = sendWebResponse(response as never, webResponse);
		await Promise.resolve();
		expect(writes).toEqual(["first"]);

		sendSecondChunk?.();
		await sendPromise;
		expect(writes).toEqual(["first", "second", "[end]"]);
	});

	it("logs successful chat-create requests before query strings", async () => {
		const captured = createCapturedLogger();
		const server = await createLoggedTestServer(captured, 201);

		try {
			await request(server)
				.post("/api/tasks/chat-create?token=secret")
				.expect(201);
		} finally {
			await closeTestServer(server);
		}
		const output = captured.output();
		expect(output).toContain("INFO");
		expect(output).toContain("HTTP request completed");
		expect(output).toContain('"method":"POST"');
		expect(output).toContain('"path":"/api/tasks/chat-create"');
		expect(output).toContain('"statusCode":201');
		expect(output).toContain('"durationMs":');
		expect(output).not.toContain("token=secret");
	});

	it("logs pre-route validation failures at info level", async () => {
		const captured = createCapturedLogger();
		const server = await createLoggedTestServer(captured, 400);

		try {
			await request(server).post("/api/tasks/chat-create").expect(400);
		} finally {
			await closeTestServer(server);
		}
		const output = captured.output();
		expect(output).toContain("INFO");
		expect(output).toContain("HTTP request completed");
		expect(output).toContain('"statusCode":400');
	});

	it("logs server error responses at error level", async () => {
		const captured = createCapturedLogger();
		const server = await createLoggedTestServer(captured, 503);

		try {
			await request(server).post("/api/tasks/chat-create").expect(503);
		} finally {
			await closeTestServer(server);
		}
		const output = captured.output();
		expect(output).toContain("ERROR");
		expect(output).toContain("HTTP request failed");
		expect(output).toContain('"statusCode":503');
	});
});

function createFakeExpress(
	listenImpl: (port: number, server: EventEmitter) => void,
): Express {
	return {
		listen(port: number) {
			const server = new EventEmitter() as unknown as Server;
			listenImpl(port, server as unknown as EventEmitter);
			return server;
		},
	} as unknown as Express;
}

async function createLoggedTestServer(
	captured: CapturedLogger,
	statusCode: number,
): Promise<Server> {
	const server = createServer(createLoggedExpressApp(captured, statusCode));
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, () => {
			server.off("error", reject);
			resolve();
		});
	});
	return server;
}

function createLoggedExpressApp(
	captured: CapturedLogger,
	statusCode: number,
): Express {
	const app = express();
	app.use(createExpressRequestLogger(captured.logger));
	app.post("/api/tasks/chat-create", (_request, response) => {
		response.status(statusCode).json({ ok: statusCode < 400 });
	});
	return app;
}

function closeTestServer(server: Server): Promise<void> {
	return new Promise((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
}

interface CapturedLogger {
	logger: ReturnType<typeof createServerLogger>;
	output(): string;
}

function createCapturedLogger(): CapturedLogger {
	let text = "";
	const destination = new Writable({
		write(chunk, _encoding, callback) {
			text += chunk.toString();
			callback();
		},
	});
	return {
		logger: createServerLogger({
			color: false,
			destination,
			env: {},
			sync: true,
		}),
		output: () => text,
	};
}

import { handleRequest } from "./app";

export const startServer = (port = 3000): Bun.Server<undefined> =>
	Bun.serve({
		port,
		fetch: handleRequest,
	});

if (import.meta.main) {
	startServer();
}

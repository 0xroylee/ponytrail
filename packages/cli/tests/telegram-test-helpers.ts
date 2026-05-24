export interface FetchCall {
	url: string;
	body: Record<string, unknown>;
}

export function createFetchMock(
	calls: FetchCall[],
	payloads: unknown[],
	responseInit: { status?: number; statusText?: string } = {},
): typeof fetch {
	let index = 0;
	return (async (input: RequestInfo | URL, init?: RequestInit) => {
		calls.push({
			url: String(input),
			body:
				typeof init?.body === "string"
					? (JSON.parse(init.body) as Record<string, unknown>)
					: {},
		});
		const payload = payloads[index] ?? payloads[payloads.length - 1];
		index += 1;
		return new Response(JSON.stringify(payload), {
			status: responseInit.status ?? 200,
			statusText: responseInit.statusText,
		});
	}) as typeof fetch;
}

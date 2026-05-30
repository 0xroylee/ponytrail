const sessionCompletionQueues = new Map<string, Promise<unknown>>();

export function queueChatSessionCompletion<T>(
	sessionId: string,
	run: () => Promise<T>,
): Promise<T> {
	const previous = sessionCompletionQueues.get(sessionId) ?? Promise.resolve();
	const next = previous.catch(() => undefined).then(run);
	sessionCompletionQueues.set(sessionId, next);
	void next
		.finally(() => {
			if (sessionCompletionQueues.get(sessionId) === next) {
				sessionCompletionQueues.delete(sessionId);
			}
		})
		.catch(() => undefined);
	return next;
}

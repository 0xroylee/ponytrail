export function shouldScrollChatTranscriptToBottom({
	currentMessageKey,
	currentSessionId,
	isLoading,
	previousMessageKey,
	previousSessionId,
}: {
	currentMessageKey: string;
	currentSessionId: string | null;
	isLoading: boolean;
	previousMessageKey: string;
	previousSessionId: string | null;
}): boolean {
	if (!currentSessionId || isLoading || !currentMessageKey) return false;
	return (
		previousSessionId !== currentSessionId ||
		previousMessageKey !== currentMessageKey
	);
}

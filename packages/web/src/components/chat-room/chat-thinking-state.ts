export interface ChatThinkingStateInput {
	hasPendingQuestions: boolean;
	isSending: boolean;
	selectedSessionId: string;
	sendingSessionId?: string;
	streamLineCount: number;
}

export function shouldShowChatThinkingIndicator({
	hasPendingQuestions,
	isSending,
	selectedSessionId,
	sendingSessionId,
	streamLineCount,
}: ChatThinkingStateInput): boolean {
	return (
		isSending &&
		Boolean(selectedSessionId) &&
		sendingSessionId === selectedSessionId &&
		streamLineCount === 0 &&
		!hasPendingQuestions
	);
}

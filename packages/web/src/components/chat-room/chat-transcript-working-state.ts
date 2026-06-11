export function shouldShowChatTranscriptWorkingHeader({
	hasWorkingStart,
	isPlanning,
	isThinking,
	streamLineCount,
}: {
	hasWorkingStart: boolean;
	isPlanning: boolean;
	isThinking: boolean;
	streamLineCount: number;
}): boolean {
	if (!hasWorkingStart) return false;
	return isPlanning || isThinking || streamLineCount > 0;
}

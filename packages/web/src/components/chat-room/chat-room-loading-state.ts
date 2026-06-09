const MIN_LOADING_SHELL_VISIBLE_MS = 1_000;

export function shouldShowChatRoomLoadingShell({
	hasSelectedSession,
	isMessagesLoading,
	isRealtimeActive = false,
}: {
	hasSelectedSession: boolean;
	isMessagesLoading: boolean;
	isRealtimeActive?: boolean;
}): boolean {
	return hasSelectedSession && isMessagesLoading;
}

export function resolveMinimumLoadingShellState({
	isLoading,
	minimumVisibleMs = MIN_LOADING_SHELL_VISIBLE_MS,
	now,
	visible,
	visibleSince,
}: {
	isLoading: boolean;
	minimumVisibleMs?: number;
	now: number;
	visible: boolean;
	visibleSince: number | null;
}): { remainingMs: number; visible: boolean; visibleSince: number | null } {
	if (isLoading) {
		return {
			remainingMs: 0,
			visible: true,
			visibleSince: visible ? (visibleSince ?? now) : now,
		};
	}
	if (!visible) {
		return { remainingMs: 0, visible: false, visibleSince: null };
	}
	const shellVisibleSince = visibleSince ?? now;
	const remainingMs = Math.max(0, minimumVisibleMs - (now - shellVisibleSince));
	if (remainingMs > 0) {
		return {
			remainingMs,
			visible: true,
			visibleSince: shellVisibleSince,
		};
	}
	return { remainingMs: 0, visible: false, visibleSince: null };
}

export function shouldShowMissionProgressSkeleton({
	hasActiveTask,
	isChatRoomLoading,
}: {
	hasActiveTask: boolean;
	isChatRoomLoading: boolean;
}): boolean {
	return isChatRoomLoading && hasActiveTask;
}

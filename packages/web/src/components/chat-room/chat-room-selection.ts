import type { ChatSessionRecord } from "@/lib/api";

export function selectChatSession(
	sessions: ChatSessionRecord[],
	activeSessionId: string,
): {
	selectedSession: ChatSessionRecord | null;
	selectedSessionId: string;
} {
	if (!activeSessionId) {
		return {
			selectedSession: null,
			selectedSessionId: "",
		};
	}
	const selectedSession =
		sessions.find((session) => session.id === activeSessionId) ?? null;
	return {
		selectedSession,
		selectedSessionId: selectedSession?.id ?? "",
	};
}

import type { ChatSessionRecord, ChatSessionUpdateRequest } from "@/lib/api";

export function isChatSessionUnread(session: ChatSessionRecord): boolean {
	return (
		!session.lastSeenAt ||
		session.updatedAt.localeCompare(session.lastSeenAt) > 0
	);
}

export function resolveChatSessionSeenUpdate(
	session: ChatSessionRecord | null,
): ChatSessionUpdateRequest | null {
	if (!session || !isChatSessionUnread(session)) {
		return null;
	}
	return { lastSeenAt: session.updatedAt };
}

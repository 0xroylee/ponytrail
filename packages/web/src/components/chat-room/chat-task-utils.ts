import type { ChatMessageRecord, ChatSessionRecord } from "@/lib/api";

export function findActiveTaskId(
	session: ChatSessionRecord | null,
	messages: ChatMessageRecord[],
): string | null {
	if (session?.taskId) {
		return session.taskId;
	}
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const taskId = messages[index]?.taskId;
		if (taskId) {
			return taskId;
		}
	}
	return null;
}

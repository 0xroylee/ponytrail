import type { ChatRepository, ChatSendAnswer } from "./types/chat.types";

export async function collectClarificationAnswers(
	repository: ChatRepository,
	sessionId: string,
): Promise<ChatSendAnswer[]> {
	const messages = await repository.listMessages(sessionId);
	return messages.flatMap((message) => readAnswerMetadata(message.metadata));
}

function readAnswerMetadata(metadata: string | null): ChatSendAnswer[] {
	if (!metadata) {
		return [];
	}
	try {
		const parsed = JSON.parse(metadata) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return [];
		}
		const answers = (parsed as Record<string, unknown>).answers;
		return Array.isArray(answers) ? answers.flatMap(readAnswer) : [];
	} catch {
		return [];
	}
}

function readAnswer(value: unknown): ChatSendAnswer[] {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return [];
	}
	const record = value as Record<string, unknown>;
	if (
		typeof record.question !== "string" ||
		typeof record.answer !== "string"
	) {
		return [];
	}
	const question = record.question.trim();
	const answer = record.answer.trim();
	return question && answer ? [{ question, answer }] : [];
}

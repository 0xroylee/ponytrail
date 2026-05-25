import type { ChatMessageRow, ChatSessionRow } from "devos-db";
import type {
	ChatClarificationQuestion,
	ChatMessageRecord,
	ChatSessionRecord,
} from "./types/chat.types";

export function mapSession(session: ChatSessionRow): ChatSessionRecord {
	return {
		...session,
		pendingQuestions: parsePendingQuestions(session.pendingQuestions),
	};
}

export function mapMessage(message: ChatMessageRow): ChatMessageRecord {
	return {
		...message,
		metadata: parseRecord(message.metadata),
	};
}

export function titleFromMessage(content: string): string {
	const normalized = content.replace(/\s+/g, " ").trim();
	return normalized.length > 42 ? `${normalized.slice(0, 39)}...` : normalized;
}

function parsePendingQuestions(
	value: string | null,
): ChatClarificationQuestion[] {
	if (!value) {
		return [];
	}
	const parsed = JSON.parse(value) as unknown;
	return Array.isArray(parsed) ? parsed.flatMap(parsePendingQuestion) : [];
}

function parsePendingQuestion(item: unknown): ChatClarificationQuestion[] {
	if (typeof item === "string" && item.trim()) {
		return [{ question: item.trim() }];
	}
	if (!item || typeof item !== "object" || Array.isArray(item)) {
		return [];
	}
	const record = item as Record<string, unknown>;
	if (typeof record.question !== "string" || !record.question.trim()) {
		return [];
	}
	const options = Array.isArray(record.options)
		? record.options.flatMap(parsePendingOption)
		: undefined;
	return [
		{
			question: record.question.trim(),
			...(options?.length ? { options } : {}),
		},
	];
}

function parsePendingOption(item: unknown) {
	if (!item || typeof item !== "object" || Array.isArray(item)) {
		return [];
	}
	const record = item as Record<string, unknown>;
	if (typeof record.label !== "string" || typeof record.value !== "string") {
		return [];
	}
	const label = record.label.trim();
	const value = record.value.trim();
	if (!label || !value) {
		return [];
	}
	const description =
		typeof record.description === "string" && record.description.trim()
			? record.description.trim()
			: undefined;
	return [{ label, value, ...(description ? { description } : {}) }];
}

function parseRecord(value: string | null): Record<string, unknown> | null {
	if (!value) {
		return null;
	}
	const parsed = JSON.parse(value) as unknown;
	return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
		? (parsed as Record<string, unknown>)
		: null;
}

import type { ChatMessageRecord, ChatSessionRecord } from "@/lib/api";
import type { ChatMissionProgressViewModel } from "./chat-mission-progress.types";

export interface CreateChatTranscriptRowsInput {
	messages: ChatMessageRecord[];
	missionProgress?: ChatMissionProgressViewModel | null;
	session?: ChatSessionRecord | null;
}

export interface ChatTranscriptMessageRow {
	kind: "message";
	message: ChatMessageRecord;
}

export interface ChatTranscriptSummaryRow {
	body: string;
	id: string;
	kind: "summary";
	title: string;
}

export type ChatTranscriptRow =
	| ChatTranscriptMessageRow
	| ChatTranscriptSummaryRow;

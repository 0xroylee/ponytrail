"use client";

import type { ChatMessageRecord, ChatSessionRecord } from "@/lib/api";

import {
	shouldLoadMissionProgressForContentMode,
	useChatRoomMission,
} from "./chat-room-mission";
import { findActiveTaskId } from "./chat-task-utils";
import type { ChatMissionProgressViewModel } from "./types/chat-mission-progress.types";
import type { ChatRoomMainContentMode } from "./types/chat-room-panel-layout.types";
import { useChatRoomContentModeState } from "./use-chat-room-content-mode-state";

export function useChatRoomMissionContentState({
	messages,
	selectedSession,
	selectedSessionId,
}: {
	messages: ChatMessageRecord[];
	selectedSession: ChatSessionRecord | null;
	selectedSessionId: string;
}): {
	activeTask: ReturnType<typeof useChatRoomMission>["activeTask"];
	activeTaskId: string | null;
	contentMode: ChatRoomMainContentMode;
	isPlanning: boolean;
	missionProgress: ChatMissionProgressViewModel | null;
	openAction: () => void;
	openMessages: () => void;
	openTaskDetails: () => void;
	refetchActiveTask: () => Promise<unknown>;
} {
	const activeTaskId = findActiveTaskId(selectedSession, messages);
	const contentMode = useChatRoomContentModeState({
		activeTaskId,
		selectedSessionId,
	});
	const mission = useChatRoomMission(selectedSession, messages, {
		activeTaskId,
		loadMissionProgress: shouldLoadMissionProgressForContentMode(
			contentMode.contentMode,
		),
	});
	return { ...mission, ...contentMode };
}

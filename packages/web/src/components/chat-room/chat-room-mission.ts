"use client";

import type {
	ChatMessageRecord,
	ChatSessionRecord,
	ProjectBoardTaskRecord,
} from "@/lib/api";
import { useBoardTaskQuery } from "@/lib/api/queries";

import { useChatMissionProgress } from "./chat-mission-progress-state";
import { findActiveTaskId } from "./chat-task-utils";
import { shouldShowChatPlanningIndicator } from "./chat-thinking-state";
import type { ChatMissionProgressViewModel } from "./types/chat-mission-progress.types";
import type { ChatRoomMainContentMode } from "./types/chat-room-panel-layout.types";

interface ChatRoomMissionOptions {
	activeTaskId?: string | null;
	loadMissionProgress?: boolean;
}

export function useChatRoomMission(
	session: ChatSessionRecord | null,
	messages: ChatMessageRecord[],
	options: ChatRoomMissionOptions = {},
): {
	activeTaskId: string | null;
	activeTask: ProjectBoardTaskRecord | null;
	isPlanning: boolean;
	missionProgress: ChatMissionProgressViewModel | null;
	refetchActiveTask: () => Promise<unknown>;
} {
	const activeTaskId =
		options.activeTaskId ?? findActiveTaskId(session, messages);
	const taskQuery = useBoardTaskQuery(activeTaskId ?? "", {
		enabled: Boolean(activeTaskId),
	});
	const missionProgress = useChatMissionProgress(activeTaskId, {
		enabled: options.loadMissionProgress !== false,
	});
	return {
		activeTaskId,
		activeTask: taskQuery.data ?? null,
		isPlanning: shouldShowChatPlanningIndicator({
			hasMissionProgress: Boolean(missionProgress),
			taskStatus: taskQuery.data?.status ?? null,
		}),
		missionProgress,
		refetchActiveTask: taskQuery.refetch,
	};
}

export function shouldLoadMissionProgressForContentMode(
	contentMode: ChatRoomMainContentMode,
): boolean {
	return contentMode === "action";
}

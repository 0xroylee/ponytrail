"use client";

import { createEmptyMissionGoalAction } from "./chat-mission-goal-action";
import { createEmptyPhaseLogLines } from "./chat-mission-progress-logs";
import { createMissionPhases } from "./chat-mission-progress-phases";
import type { ChatMissionProgressViewModel } from "./types/chat-mission-progress.types";

export function createMissionState(
	taskId: string,
	state: "loading" | "error",
	overrides: Partial<ChatMissionProgressViewModel> = {},
): ChatMissionProgressViewModel {
	const statusLabel = state === "loading" ? "Loading" : "Unavailable";
	return {
		state,
		taskId,
		taskKey: "",
		title: "",
		status: "",
		statusLabel,
		updatedAt: "",
		notes: [],
		executions: [],
		goalAction: createEmptyMissionGoalAction(statusLabel),
		latestLogLines: [],
		latestResult: null,
		usageSummary: null,
		phaseLogLines: createEmptyPhaseLogLines(),
		phases: createMissionPhases({
			executions: [],
			latestResult: null,
			taskStatus: "",
		}),
		...overrides,
	};
}

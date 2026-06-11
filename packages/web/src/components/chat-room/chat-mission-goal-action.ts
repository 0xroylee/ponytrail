"use client";

import type { ProjectBoardTaskRecord } from "@/lib/api";

import type {
	ChatMissionExecution,
	ChatMissionGoalAction,
	ChatMissionPhase,
	ChatMissionPhaseStatus,
	ChatMissionResult,
} from "./types/chat-mission-progress.types";

type MissionGoalTask = Pick<
	ProjectBoardTaskRecord,
	"status" | "taskKey" | "title"
>;

export function createMissionGoalAction({
	executions,
	latestResult,
	phases,
	statusLabel,
	task,
}: {
	executions: ChatMissionExecution[];
	latestResult: ChatMissionResult | null;
	phases: ChatMissionPhase[];
	statusLabel: string;
	task: MissionGoalTask;
}): ChatMissionGoalAction {
	const taskTitle = task.title.trim() || "Untitled task";
	const successGoal = latestSuccessGoal(executions);
	return {
		id: "goal",
		label: "Goal",
		title: successGoal ?? taskTitle,
		description: successGoal && successGoal !== taskTitle ? taskTitle : null,
		status: resolveMissionGoalActionStatus(task.status, phases, latestResult),
		metadata: compactText([task.taskKey, statusLabel]),
	};
}

export function createEmptyMissionGoalAction(
	statusLabel: string,
): ChatMissionGoalAction {
	return createMissionGoalAction({
		executions: [],
		latestResult: null,
		phases: [],
		statusLabel,
		task: { status: "", taskKey: "", title: "" },
	});
}

export function resolveMissionGoalActionStatus(
	taskStatus: string,
	phases: ChatMissionPhase[],
	latestResult: ChatMissionResult | null = null,
): ChatMissionPhaseStatus {
	const normalized = taskStatus.toLowerCase();
	if (normalized === "done") return "success";
	if (normalized === "failed") return "failed";
	if (normalized === "canceled") return "warning";
	if (latestResult?.tone === "error") return "failed";
	if (latestResult?.tone === "warning") return "warning";
	if (
		latestResult?.tone === "success" &&
		phases.length > 0 &&
		phases.every((phase) => phase.status === "success")
	) {
		return "success";
	}
	const blockingPhase = phases.find(
		(phase) => phase.status === "failed" || phase.status === "warning",
	);
	if (blockingPhase) return blockingPhase.status;
	if (phases.some((phase) => phase.status !== "pending")) return "running";
	return "pending";
}

function latestSuccessGoal(executions: ChatMissionExecution[]): string | null {
	for (
		let executionIndex = executions.length - 1;
		executionIndex >= 0;
		executionIndex -= 1
	) {
		const execution = executions[executionIndex];
		if (!execution) continue;
		for (
			let stepIndex = execution.steps.length - 1;
			stepIndex >= 0;
			stepIndex -= 1
		) {
			const step = execution.steps[stepIndex];
			const successGoal = readString(parseDetail(step?.detail).successGoal);
			if (successGoal) return successGoal;
		}
	}
	return null;
}

function parseDetail(
	detail: string | null | undefined,
): Record<string, unknown> {
	if (!detail) return {};
	try {
		const parsed = JSON.parse(detail) as unknown;
		return parsed && typeof parsed === "object"
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function compactText(values: string[]): string[] {
	return values.map((value) => value.trim()).filter(Boolean);
}

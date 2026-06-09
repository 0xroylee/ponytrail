import type { ProjectBoardTaskRecord, TaskActivityRecord } from "../../lib/api";

export function createActivityDisclosureState({
	activityCount,
	isCollapsed,
}: {
	activityCount: number;
	isCollapsed: boolean;
}): {
	ariaExpanded: boolean;
	countLabel: string;
	isListHidden: boolean;
	listClassName: string;
} {
	return {
		ariaExpanded: !isCollapsed,
		countLabel: formatCount(activityCount),
		isListHidden: isCollapsed,
		listClassName: isCollapsed ? "hidden" : "grid gap-3",
	};
}

export function createTaskCreatedActivity(
	task: ProjectBoardTaskRecord,
): TaskActivityRecord {
	return {
		id: `${task.id}:created:fallback`,
		kind: "created",
		actorId: task.creatorId,
		actorType: "human",
		title: "created this issue",
		body: "",
		status: task.status,
		createdAt: task.createdAt,
	};
}

function formatCount(count: number): string {
	return count === 1 ? "1 activity" : `${count} activities`;
}

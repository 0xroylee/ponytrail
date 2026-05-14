import type {
	ProjectBoardStatusColumn,
	ProjectBoardTaskRecord,
} from "@/lib/api";

import { STATUS_ORDER, STATUS_PRESENTATION } from "./issues-board.constants";
import type { IssueDraft, IssueTab } from "./issues-board.types";

export function getStatusLabel(status: string): string {
	return STATUS_PRESENTATION[status]?.label ?? status;
}

export function isAgentTask(task: ProjectBoardTaskRecord): boolean {
	const haystack =
		`${task.creatorId} ${task.title} ${task.content}`.toLowerCase();
	return /\bagent\b|codex|claude|autopilot|bot/.test(haystack);
}

export function filterTaskByTab(
	task: ProjectBoardTaskRecord,
	tab: IssueTab,
): boolean {
	if (tab === "all") {
		return true;
	}
	const agentTask = isAgentTask(task);
	return tab === "agents" ? agentTask : !agentTask;
}

export function createEmptyDraft(status: string): IssueDraft {
	return {
		title: "",
		content: "",
		priority: "1",
		status,
		dueDate: "",
		linkedPr: "",
		creatorId: "member-1",
	};
}

export function createDraftFromTask(task: ProjectBoardTaskRecord): IssueDraft {
	return {
		title: task.title,
		content: task.content,
		priority: String(task.priority),
		status: task.status,
		dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
		linkedPr: task.linkedPr ?? "",
		creatorId: task.creatorId,
	};
}

export function normalizeDueDate(value: string): string | null {
	return value.trim().length === 0 ? null : new Date(value).toISOString();
}

export function sortColumns(
	columns: ProjectBoardStatusColumn[],
): ProjectBoardStatusColumn[] {
	return [...columns].sort((left, right) => {
		const leftIndex = STATUS_ORDER.indexOf(
			left.status as (typeof STATUS_ORDER)[number],
		);
		const rightIndex = STATUS_ORDER.indexOf(
			right.status as (typeof STATUS_ORDER)[number],
		);
		return normalizeIndex(leftIndex) - normalizeIndex(rightIndex);
	});
}

function normalizeIndex(index: number): number {
	return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

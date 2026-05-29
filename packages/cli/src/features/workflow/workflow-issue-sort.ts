import type { WorkflowIssue } from "./types/workflow.types";

const PRIORITY_SORT_ORDER: Record<number, number> = {
	1: 0,
	2: 1,
	3: 2,
	4: 3,
	0: 4,
};

export function sortIssuesByPriority(issues: WorkflowIssue[]): WorkflowIssue[] {
	return issues
		.map((issue, index) => ({ issue, index }))
		.sort((left, right) => {
			const rankDiff =
				getPriorityRank(left.issue.priority.value) -
				getPriorityRank(right.issue.priority.value);
			if (rankDiff !== 0) {
				return rankDiff;
			}
			return left.index - right.index;
		})
		.map((entry) => entry.issue);
}

function getPriorityRank(priority: number): number {
	return PRIORITY_SORT_ORDER[priority] ?? PRIORITY_SORT_ORDER[0];
}

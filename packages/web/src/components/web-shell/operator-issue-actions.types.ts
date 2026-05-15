import type { OpenIssueRequest } from "@/components/issues-board/issues-board.types";

export interface OperatorIssueActionsContextValue {
	createIssueRequest: number;
	openIssueRequest: OpenIssueRequest | null;
	requestNewIssue: () => void;
	requestOpenIssue: (taskId: string) => void;
}

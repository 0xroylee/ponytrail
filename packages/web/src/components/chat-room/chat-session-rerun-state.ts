import { buildIssueRunCommand } from "@/lib/api";
import type {
	ChatSessionRecord,
	ProjectBoardTaskRecord,
} from "@/lib/api/types/client.types";
import type { RunCliCommandStreamRequest } from "@/lib/api/types/command-stream-client.types";

interface ChatSessionRerunStateInput {
	hasSubmittedRerun?: boolean;
	isBusy: boolean;
	session: ChatSessionRecord | null;
	task: ProjectBoardTaskRecord | null;
}

interface ChatSessionRerunState {
	command: RunCliCommandStreamRequest | null;
	isDisabled: boolean;
	isVisible: boolean;
}

export function resolveChatSessionRerunState(
	input: ChatSessionRerunStateInput,
): ChatSessionRerunState {
	if (input.session?.workflowState !== "failed") {
		return hiddenRerunState();
	}
	if (input.hasSubmittedRerun || input.isBusy) {
		return disabledRerunState();
	}
	const task = input.task;
	const projectId = task?.projectId ?? input.session.projectId;
	if (!task || task.id !== input.session.taskId || !projectId) {
		return disabledRerunState();
	}
	return {
		command: buildIssueRunCommand({
			issueKey: task.taskKey,
			projectId,
		}),
		isDisabled: false,
		isVisible: true,
	};
}

function hiddenRerunState(): ChatSessionRerunState {
	return { command: null, isDisabled: true, isVisible: false };
}

function disabledRerunState(): ChatSessionRerunState {
	return { command: null, isDisabled: true, isVisible: true };
}

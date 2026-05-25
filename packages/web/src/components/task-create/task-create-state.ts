import type { TaskCreateChatState } from "./types/task-create-chat-dialog.types";

export function createInitialState(
	defaultBoardProjectId: string,
): TaskCreateChatState {
	return {
		request: "",
		projectId: defaultBoardProjectId,
		answers: [],
		clarificationIndex: 0,
		questions: [],
		submittedAnswers: [],
		step: "request",
		errorMessage: null,
		result: null,
		logs: [],
	};
}

import type { ChatSessionRow } from "devos-db";
import type { BoardTaskApiRecord } from "../tasks";
import { collectClarificationAnswers } from "./chat-answer-metadata";
import {
	DEFAULT_CHAT_ISSUE_CONTENT,
	DEFAULT_CHAT_ISSUE_TITLE,
	UNTITLED_SESSION,
} from "./chat-defaults";
import { mapMessage, mapSession, titleFromMessage } from "./chat-mappers";
import { appendChatMessage, updateChatSessionRow } from "./chat-writes";
import type {
	ChatClarificationQuestion,
	ChatRepository,
	ChatSendInput,
	ChatSendResult,
	ChatSendStreamCallbacks,
	ChatServiceDeps,
	ChatSessionUpdateInput,
} from "./types/chat.types";

interface RequirementResult {
	assistantKind: "task" | "clarification";
	assistantText: string;
	issue: BoardTaskApiRecord;
	sessionUpdate: ChatSessionUpdateInput;
}

export async function sendChatMessage(
	repository: ChatRepository,
	deps: ChatServiceDeps,
	sessionId: string,
	input: ChatSendInput,
	stream?: ChatSendStreamCallbacks,
): Promise<ChatSendResult | null> {
	const session = await repository.getSession(sessionId);
	if (!session) {
		return null;
	}
	const linked = await ensureIssueForSession(repository, deps, session);
	const userMessage = await appendChatMessage(repository, sessionId, {
		content: input.content,
		kind: input.answers?.length ? "clarification" : "message",
		metadata: input.answers ? { answers: input.answers } : null,
		role: "user",
		taskId: linked.issue.id,
	});
	const userRecord = mapMessage(userMessage);
	stream?.onUserMessage?.(userRecord);
	stream?.onStreamStarted?.({
		runId: stream.runId,
		sessionId,
		userMessageId: userRecord.id,
	});
	try {
		const requestText = linked.session.pendingRequest ?? input.content.trim();
		const requirement = await deps.resolveTaskRequirement({
			request: requestText,
			projectId:
				linked.session.projectId ?? linked.issue.projectId ?? undefined,
			answers: await collectClarificationAnswers(repository, sessionId),
		});
		const outcome = await applyRequirementResult(
			deps,
			linked.issue,
			linked.session,
			requestText,
			requirement,
		);
		const updatedSession = await updateSessionAfterRequirement(
			repository,
			linked.session,
			outcome.sessionUpdate,
		);
		const assistantChunks = [outcome.assistantText];
		for (const delta of assistantChunks) {
			stream?.onStreamDelta?.({ delta, runId: stream.runId, sessionId });
		}
		const assistantMessage = await appendChatMessage(repository, sessionId, {
			content: assistantChunks.join(""),
			kind: outcome.assistantKind,
			metadata: { runId: stream?.runId ?? null },
			role: "assistant",
			taskId: outcome.issue.id,
		});
		const assistantRecord = mapMessage(assistantMessage);
		stream?.onStreamCompleted?.({
			message: assistantRecord,
			runId: stream.runId,
			sessionId,
		});
		stream?.onAssistantMessage?.(assistantRecord);
		return {
			issue: outcome.issue,
			session: mapSession(updatedSession),
			messages: [userRecord, assistantRecord],
		};
	} catch (error) {
		stream?.onStreamError?.({
			error: error instanceof Error ? error.message : String(error),
			runId: stream.runId,
			sessionId,
		});
		throw error;
	}
}

export async function ensureIssueForSession(
	repository: ChatRepository,
	deps: ChatServiceDeps,
	session: ChatSessionRow,
): Promise<{ issue: BoardTaskApiRecord; session: ChatSessionRow }> {
	const existingIssue = session.taskId
		? await deps.getIssue(session.taskId)
		: null;
	if (existingIssue) {
		const projectId =
			session.projectId ??
			existingIssue.projectId ??
			(await deps.ensureDefaultProject()).id;
		if (session.projectId === projectId) {
			return { issue: existingIssue, session };
		}
		const updated = await updateChatSessionRow(repository, session.id, {
			projectId,
		});
		return { issue: existingIssue, session: updated ?? session };
	}
	const projectId = session.projectId ?? (await deps.ensureDefaultProject()).id;
	const issue = await deps.createIssue({
		content: DEFAULT_CHAT_ISSUE_CONTENT,
		projectId,
		title: DEFAULT_CHAT_ISSUE_TITLE,
	});
	const updated = await updateChatSessionRow(repository, session.id, {
		projectId,
		taskId: issue.id,
	});
	return {
		issue,
		session: updated ?? { ...session, projectId, taskId: issue.id },
	};
}

async function updateSessionAfterRequirement(
	repository: ChatRepository,
	session: ChatSessionRow,
	input: ChatSessionUpdateInput,
): Promise<ChatSessionRow> {
	return (
		(await updateChatSessionRow(repository, session.id, input)) ??
		(await repository.getSession(session.id)) ??
		session
	);
}

async function applyRequirementResult(
	deps: ChatServiceDeps,
	issue: BoardTaskApiRecord,
	session: ChatSessionRow,
	requestText: string,
	requirement: Awaited<ReturnType<ChatServiceDeps["resolveTaskRequirement"]>>,
): Promise<RequirementResult> {
	if (requirement.status === "needs_info") {
		const updatedIssue = await deps.updateIssue(issue.id, {
			status: "backlog",
		});
		return {
			assistantKind: "clarification",
			assistantText: clarificationText(requirement.questions),
			issue: updatedIssue,
			sessionUpdate: {
				pendingRequest: requestText,
				pendingQuestions: requirement.questions,
				...(session.title === UNTITLED_SESSION
					? { title: titleFromMessage(requestText) }
					: {}),
			},
		};
	}
	const updatedIssue = await deps.updateIssue(issue.id, {
		content: requirement.task.description,
		status: "plan",
		title: requirement.task.title,
	});
	return {
		assistantKind: "task",
		assistantText: `Task ${updatedIssue.taskKey}: ${updatedIssue.title} is ready for planning.`,
		issue: updatedIssue,
		sessionUpdate: {
			pendingRequest: null,
			pendingQuestions: null,
			title: requirement.task.title,
		},
	};
}

function clarificationText(questions: ChatClarificationQuestion[]): string {
	const currentQuestion = questions[0];
	if (!currentQuestion) {
		return "I need a bit more detail before this is ready for planning.";
	}
	return [
		"I need a bit more detail before this is ready for planning:",
		formatClarificationQuestion(currentQuestion),
	].join("\n");
}

function formatClarificationQuestion(
	question: ChatClarificationQuestion,
): string {
	const options = question.options?.length
		? question.options
				.map((option) => `  - ${option.label}: ${option.value}`)
				.join("\n")
		: "";
	return options
		? `- ${question.question}\n${options}`
		: `- ${question.question}`;
}

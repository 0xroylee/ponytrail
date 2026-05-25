"use client";

import { type ReactElement, useState } from "react";

import {
	buildClarificationAnswers,
	hasClarificationAnswer,
	resolveClarificationStep,
	updateClarificationAnswer,
} from "@/components/clarification/clarification-queue-utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { formatTaskCreateError } from "./task-create-chat-errors";
import { getTaskCreateStatusText } from "./task-create-chat-status";
import { TaskCreateClarificationStep } from "./task-create-clarification-step";
import {
	TaskCreateDialogFields,
	TaskCreateDialogFooter,
	TaskCreateDialogHeader,
	TaskCreateDialogResult,
} from "./task-create-dialog-parts";
import { TaskCreateLogPanel, createLogLine } from "./task-create-log-panel";
import { createInitialState } from "./task-create-state";
import { streamTaskCreate } from "./task-create-stream";
import type {
	TaskCreateChatDialogProps,
	TaskCreateChatState,
} from "./types/task-create-chat-dialog.types";

export function TaskCreateChatDialog({
	defaultBoardProjectId,
	onClose,
}: TaskCreateChatDialogProps): ReactElement {
	const [state, setState] = useState<TaskCreateChatState>(() =>
		createInitialState(defaultBoardProjectId),
	);
	const [isStreaming, setIsStreaming] = useState(false);
	const canSubmitRequest = state.request.trim().length > 0 && !isStreaming;
	const clarificationStep = resolveClarificationStep(
		state.questions,
		state.clarificationIndex,
	);
	const canSubmitAnswers =
		clarificationStep.currentQuestion !== null &&
		hasClarificationAnswer(
			state.answers.map((answer) => answer.answer),
			clarificationStep.currentIndex,
		) &&
		!isStreaming;

	const statusText = getTaskCreateStatusText({
		isStreaming,
		result: state.result,
		step: state.step,
	});

	async function submitTask(nextAnswers = state.answers): Promise<void> {
		setIsStreaming(true);
		setState((current) => ({
			...current,
			errorMessage: null,
			logs: [
				...current.logs,
				createLogLine("system", "Started task creation stream."),
			],
		}));
		try {
			const response = await streamTaskCreate({
				request: state.request.trim(),
				projectId: state.projectId.trim() || undefined,
				answers: nextAnswers.length > 0 ? nextAnswers : undefined,
				onLog: (stream, text) => {
					setState((current) => ({
						...current,
						logs: [...current.logs, createLogLine(stream, text)],
					}));
				},
			});
			if (response.status === "needs_info") {
				setState((current) => ({
					...current,
					answers: response.questions.map((question) => ({
						question: question.question,
						answer: "",
					})),
					clarificationIndex: 0,
					questions: response.questions,
					submittedAnswers: nextAnswers,
					step: "clarifying",
				}));
				return;
			}
			if (response.status === "created") {
				setState((current) => ({
					...current,
					answers: [],
					clarificationIndex: 0,
					questions: [],
					result: response,
					submittedAnswers: [],
					step: "created",
				}));
				return;
			}
			setState((current) => ({
				...current,
				errorMessage: formatTaskCreateError(response),
			}));
		} catch (error) {
			setState((current) => ({
				...current,
				errorMessage:
					error instanceof Error ? error.message : "Failed to create task",
			}));
		} finally {
			setIsStreaming(false);
		}
	}

	function updateAnswer(index: number, value: string): void {
		setState((current) => ({
			...current,
			answers: updateClarificationAnswer(
				current.answers.map((answer) => answer.answer),
				index,
				value,
			).map((answer, answerIndex) => ({
				question: current.questions[answerIndex]?.question ?? "",
				answer,
			})),
		}));
	}

	async function submitClarificationAnswer(): Promise<void> {
		if (!clarificationStep.currentQuestion || !canSubmitAnswers) {
			return;
		}
		const answerValues = state.answers.map((answer) => answer.answer);
		const queuedAnswers = buildClarificationAnswers(
			state.questions,
			answerValues,
		);
		if (!clarificationStep.isFinalStep) {
			setState((current) => ({
				...current,
				clarificationIndex: clarificationStep.currentIndex + 1,
			}));
			return;
		}
		await submitTask([...state.submittedAnswers, ...queuedAnswers]);
	}

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className="max-h-[100dvh] max-w-2xl overflow-auto p-5"
				showCloseButton={false}
			>
				<TaskCreateDialogHeader statusText={statusText} onClose={onClose} />
				<TaskCreateDialogFields
					isStreaming={isStreaming}
					state={state}
					onStateChange={setState}
				/>
				{state.step === "clarifying" ? (
					<div className="grid gap-3 rounded-lg border border-zinc-800 bg-[#141519] p-3">
						{clarificationStep.currentQuestion ? (
							<TaskCreateClarificationStep
								answer={
									state.answers[clarificationStep.currentIndex]?.answer ?? ""
								}
								currentIndex={clarificationStep.currentIndex}
								question={clarificationStep.currentQuestion}
								onAnswerChange={updateAnswer}
							/>
						) : null}
					</div>
				) : null}
				<TaskCreateDialogResult state={state} />
				<TaskCreateLogPanel logs={state.logs} />
				{state.errorMessage ? (
					<p className="m-0 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
						{state.errorMessage}
					</p>
				) : null}
				<TaskCreateDialogFooter
					canSubmitAnswers={canSubmitAnswers}
					canSubmitRequest={canSubmitRequest}
					isFinalClarificationStep={clarificationStep.isFinalStep}
					step={state.step}
					onClose={onClose}
					onPrimary={() =>
						state.step === "clarifying"
							? void submitClarificationAnswer()
							: void submitTask()
					}
				/>
			</DialogContent>
		</Dialog>
	);
}

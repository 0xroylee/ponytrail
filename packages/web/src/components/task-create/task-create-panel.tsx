"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";

import {
	buildClarificationAnswers,
	hasClarificationAnswer,
	resolveClarificationStep,
	updateClarificationAnswer,
} from "@/components/clarification/clarification-queue-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TaskClarificationQuestion, TaskCreateAnswer } from "@/lib/api";
import { useCreateTaskMutation } from "@/lib/api/queries";
import { formatTaskCreateError } from "./task-create-chat-errors";

export function TaskCreatePanel(): ReactElement {
	const createTask = useCreateTaskMutation();
	const [request, setRequest] = useState<string>("");
	const [projectId, setProjectId] = useState<string>("default");
	const [answers, setAnswers] = useState<TaskCreateAnswer[]>([]);
	const [activeQuestions, setActiveQuestions] = useState<
		TaskClarificationQuestion[]
	>([]);
	const [clarificationIndex, setClarificationIndex] = useState(0);
	const [submittedAnswers, setSubmittedAnswers] = useState<TaskCreateAnswer[]>(
		[],
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const canSubmitInitial = request.trim().length > 0 && !createTask.isPending;
	const clarificationStep = resolveClarificationStep(
		activeQuestions,
		clarificationIndex,
	);
	const canSubmitClarifications =
		clarificationStep.currentQuestion !== null &&
		hasClarificationAnswer(
			answers.map((answer) => answer.answer),
			clarificationStep.currentIndex,
		) &&
		!createTask.isPending;

	const statusText = useMemo(() => {
		if (createTask.isPending) {
			return "Submitting task request...";
		}
		if (createTask.data?.status === "created") {
			return `Created ${createTask.data.task.taskKey}`;
		}
		if (createTask.data?.status === "needs_info") {
			return "Additional clarification required.";
		}
		if (errorMessage) {
			return errorMessage;
		}
		return "Enter a requirement to create a task.";
	}, [createTask.data, createTask.isPending, errorMessage]);

	async function submitRequest(
		nextRequest: string,
		nextAnswers?: TaskCreateAnswer[],
	): Promise<void> {
		setErrorMessage(null);
		try {
			const response = await createTask.mutateAsync({
				request: nextRequest,
				projectId: projectId.trim() || undefined,
				answers: nextAnswers,
			});
			if (response.status === "needs_info") {
				setActiveQuestions(response.questions);
				setClarificationIndex(0);
				setSubmittedAnswers(nextAnswers ?? []);
				setAnswers(
					response.questions.map((question) => ({
						question: question.question,
						answer: "",
					})),
				);
				return;
			}
			if (response.status === "created") {
				setActiveQuestions([]);
				setAnswers([]);
				setClarificationIndex(0);
				setSubmittedAnswers([]);
				return;
			}
			setErrorMessage(formatTaskCreateError(response));
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to create task",
			);
		}
	}

	function updateAnswer(index: number, value: string): void {
		setAnswers((current) =>
			updateClarificationAnswer(
				current.map((answer) => answer.answer),
				index,
				value,
			).map((answer, answerIndex) => ({
				question: activeQuestions[answerIndex]?.question ?? "",
				answer,
			})),
		);
	}

	async function handleInitialSubmit(): Promise<void> {
		setSubmittedAnswers([]);
		await submitRequest(request.trim(), []);
	}

	async function handleClarificationSubmit(): Promise<void> {
		if (!clarificationStep.currentQuestion || !canSubmitClarifications) {
			return;
		}
		const queuedAnswers = buildClarificationAnswers(
			activeQuestions,
			answers.map((answer) => answer.answer),
		);
		if (!clarificationStep.isFinalStep) {
			setClarificationIndex(clarificationStep.currentIndex + 1);
			return;
		}
		await submitRequest(request.trim(), [
			...submittedAnswers,
			...queuedAnswers,
		]);
	}

	return (
		<section
			style={{
				border: "1px solid #27272a",
				borderRadius: "8px",
				background: "#18191d",
				color: "#f4f4f5",
				padding: "1rem",
				width: "100%",
			}}
		>
			<h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Create Task</h2>
			<p style={{ marginTop: 0, color: "#a1a1aa" }}>{statusText}</p>
			<label
				htmlFor="task-create-requirement"
				style={{ display: "block", marginBottom: "0.5rem" }}
			>
				Requirement
			</label>
			<Textarea
				className="mb-3 min-h-32 resize-y"
				id="task-create-requirement"
				value={request}
				onChange={(event) => setRequest(event.target.value)}
				placeholder="Describe the task requirement"
				rows={5}
			/>
			<label
				htmlFor="task-create-project-id"
				style={{ display: "block", marginBottom: "0.5rem" }}
			>
				Project ID
			</label>
			<Input
				className="mb-3"
				id="task-create-project-id"
				type="text"
				value={projectId}
				onChange={(event) => setProjectId(event.target.value)}
				placeholder="default"
			/>
			<Button
				type="button"
				onClick={handleInitialSubmit}
				disabled={!canSubmitInitial}
			>
				Submit Requirement
			</Button>
			{activeQuestions.length > 0 ? (
				<div style={{ marginTop: "1rem" }}>
					<h3 style={{ marginTop: 0 }}>Clarification Question</h3>
					{clarificationStep.currentQuestion ? (
						<div
							key={clarificationStep.currentQuestion.question}
							style={{ marginBottom: "0.75rem" }}
						>
							<p style={{ marginTop: 0, marginBottom: "0.5rem" }}>
								{clarificationStep.currentQuestion.question}
							</p>
							{clarificationStep.currentQuestion.options?.length ? (
								<div className="mb-2 flex flex-wrap gap-2">
									{clarificationStep.currentQuestion.options.map((option) => (
										<Button
											key={option.value}
											onClick={() =>
												updateAnswer(
													clarificationStep.currentIndex,
													option.value,
												)
											}
											size="sm"
											type="button"
											variant={
												answers[clarificationStep.currentIndex]?.answer ===
												option.value
													? "default"
													: "secondary"
											}
										>
											{option.label}
										</Button>
									))}
								</div>
							) : null}
							<Input
								type="text"
								value={answers[clarificationStep.currentIndex]?.answer ?? ""}
								onChange={(event) =>
									updateAnswer(
										clarificationStep.currentIndex,
										event.target.value,
									)
								}
								placeholder="Type a custom answer"
							/>
						</div>
					) : null}
					<Button
						type="button"
						onClick={handleClarificationSubmit}
						disabled={!canSubmitClarifications}
					>
						{clarificationStep.isFinalStep ? "Submit Answer" : "Next"}
					</Button>
				</div>
			) : null}
			{createTask.data?.status === "created" ? (
				<p style={{ marginBottom: 0 }}>
					Task key: {createTask.data.task.taskKey}
				</p>
			) : null}
		</section>
	);
}

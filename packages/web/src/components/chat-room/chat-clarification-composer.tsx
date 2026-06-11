"use client";

import { type KeyboardEvent, type ReactElement, useState } from "react";

import { ClarificationOptionButton } from "@/components/clarification/clarification-option-button";
import { resolveClarificationStep } from "@/components/clarification/clarification-queue-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";

import {
	isChatClarificationOptionSelected,
	resolveChatClarificationOptionAnswer,
} from "./chat-clarification-option-answer";
import type { ChatClarificationComposerProps } from "./types/chat-room.types";

export function ChatClarificationComposer({
	answers,
	contentWidthClassName,
	disabled,
	pendingQuestionIndex,
	questions,
	onAnswerChange,
	onSelectOption,
	onSubmit,
}: ChatClarificationComposerProps): ReactElement | null {
	const [isSubmittingOption, setIsSubmittingOption] = useState(false);
	const [submittedQuestionKey, setSubmittedQuestionKey] = useState<
		string | null
	>(null);
	const pendingQuestionKey = JSON.stringify(
		questions.map((question) => ({
			options: question.options ?? [],
			question: question.question,
		})),
	);
	const step = resolveClarificationStep(questions, pendingQuestionIndex);
	const answer = answers[step.currentIndex] ?? "";
	const controlsDisabled = disabled || isSubmittingOption;
	const canSubmit = step.currentQuestion !== null && answer.trim().length > 0;
	const hideSubmittedComposer =
		step.isFinalStep && submittedQuestionKey === pendingQuestionKey;

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
		if (event.key !== "Enter" || !canSubmit || controlsDisabled) {
			return;
		}
		event.preventDefault();
		void handleSubmitAnswer();
	}

	async function submitAndHide(
		submit: () => Promise<void> | void,
	): Promise<void> {
		setSubmittedQuestionKey(pendingQuestionKey);
		try {
			await submit();
		} catch (error) {
			setSubmittedQuestionKey(null);
			throw error;
		}
	}

	async function handleSubmitAnswer(): Promise<void> {
		if (!canSubmit || controlsDisabled) return;
		if (!step.isFinalStep) {
			await onSubmit();
			return;
		}
		await submitAndHide(onSubmit);
	}

	async function handleSelectOption(optionAnswer: string): Promise<void> {
		if (controlsDisabled) return;
		setIsSubmittingOption(true);
		try {
			if (step.isFinalStep) {
				await submitAndHide(() =>
					onSelectOption(step.currentIndex, optionAnswer),
				);
				return;
			}
			await onSelectOption(step.currentIndex, optionAnswer);
		} finally {
			setIsSubmittingOption(false);
		}
	}

	if (!step.currentQuestion || hideSubmittedComposer) {
		return null;
	}

	return (
		<div className="px-4 py-3">
			<div
				className={`mx-auto grid w-full ${contentWidthClassName} gap-3 rounded-md border border-border bg-surface-panel p-3`}
			>
				<div className="grid gap-2 text-sm">
					<Typography
						as="span"
						id={`clarification-composer-question-${step.currentIndex}`}
					>
						{step.currentQuestion.question}
					</Typography>
					{step.currentQuestion.options?.length ? (
						<div className="flex flex-col gap-2">
							{step.currentQuestion.options.map((option) => (
								<ClarificationOptionButton
									disabled={controlsDisabled}
									key={option.value}
									onSelect={() =>
										void handleSelectOption(
											resolveChatClarificationOptionAnswer(option),
										)
									}
									option={option}
									selected={isChatClarificationOptionSelected(answer, option)}
								/>
							))}
						</div>
					) : null}
					<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
						<Input
							aria-labelledby={`clarification-composer-question-${step.currentIndex}`}
							disabled={controlsDisabled}
							id={`clarification-composer-answer-${step.currentIndex}`}
							onChange={(event) =>
								onAnswerChange(step.currentIndex, event.target.value)
							}
							onKeyDown={handleKeyDown}
							placeholder="Type a custom answer"
							value={answer}
						/>
						<Button
							disabled={controlsDisabled || !canSubmit}
							onClick={() => void handleSubmitAnswer()}
							type="button"
						>
							{step.isFinalStep ? "Submit" : "Next"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

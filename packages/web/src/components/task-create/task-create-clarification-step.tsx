"use client";

import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TaskClarificationQuestion } from "@/lib/api";

export interface TaskCreateClarificationStepProps {
	answer: string;
	currentIndex: number;
	question: TaskClarificationQuestion;
	onAnswerChange: (index: number, value: string) => void;
}

export function TaskCreateClarificationStep({
	answer,
	currentIndex,
	question,
	onAnswerChange,
}: TaskCreateClarificationStepProps): ReactElement {
	return (
		<label
			className="grid gap-1.5 text-sm text-zinc-400"
			htmlFor={`task-create-chat-answer-${currentIndex}`}
		>
			<span>{question.question}</span>
			{question.options?.length ? (
				<div className="flex flex-wrap gap-2">
					{question.options.map((option) => (
						<Button
							key={option.value}
							onClick={() => onAnswerChange(currentIndex, option.value)}
							size="sm"
							type="button"
							variant={answer === option.value ? "default" : "secondary"}
						>
							{option.label}
						</Button>
					))}
				</div>
			) : null}
			<Input
				id={`task-create-chat-answer-${currentIndex}`}
				onChange={(event) => onAnswerChange(currentIndex, event.target.value)}
				placeholder="Type a custom answer"
				value={answer}
			/>
		</label>
	);
}

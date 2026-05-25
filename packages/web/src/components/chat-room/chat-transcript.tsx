"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import type { ReactElement } from "react";

import { resolveClarificationStep } from "@/components/clarification/clarification-queue-utils";
import { TextShimmer } from "@/components/loading/text-shimmer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessageRecord, TaskClarificationQuestion } from "@/lib/api";
import { cn } from "@/lib/utils";

import type { ChatTranscriptProps } from "./types/chat-room.types";

export function ChatTranscript({
	error,
	isLoading,
	isThinking,
	messages,
	pendingAnswers,
	pendingQuestionIndex,
	session,
	streamLines,
	onAnswerChange,
	onSubmitAnswers,
}: ChatTranscriptProps): ReactElement {
	const pendingQuestions = session?.pendingQuestions ?? [];
	const hasPendingQuestions = pendingQuestions.length > 0;
	const showThinking =
		isThinking && !hasPendingQuestions && streamLines.length === 0;
	return (
		<div className="min-h-0 overflow-auto px-4 py-6">
			<div className="mx-auto grid max-w-4xl gap-4">
				{isLoading ? <StatusLine text="Loading session..." /> : null}
				{error ? <ErrorLine text={error.message} /> : null}
				{!isLoading && messages.length === 0 ? (
					<div className="pt-[18dvh] text-center text-zinc-500">
						<h1 className="mb-2 text-2xl font-semibold text-zinc-100">
							{session?.title ?? "Untitled"}
						</h1>
						<p className="m-0 text-sm">Ready for a task.</p>
					</div>
				) : null}
				{messages.map((message) => (
					<ChatMessageBubble key={message.id} message={message} />
				))}
				{hasPendingQuestions ? (
					<ClarificationBox
						answers={pendingAnswers}
						pendingQuestionIndex={pendingQuestionIndex}
						questions={pendingQuestions}
						onAnswerChange={onAnswerChange}
						onSubmit={onSubmitAnswers}
					/>
				) : null}
				{showThinking ? <ThinkingLine /> : null}
				{streamLines.length > 0 ? (
					<div className="justify-self-start whitespace-pre-wrap rounded-md border border-zinc-800 bg-[#17181c] px-3 py-2 font-mono text-xs text-zinc-300">
						{streamLines.map((line) => (
							<div
								className={line.stream === "stderr" ? "text-red-200" : ""}
								key={line.id}
							>
								{line.text}
							</div>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
}

function ThinkingLine(): ReactElement {
	return (
		<output
			aria-live="polite"
			className="justify-self-start rounded-md border border-zinc-800 bg-[#17181c] px-3 py-2 text-sm"
		>
			<TextShimmer>Thinking...</TextShimmer>
		</output>
	);
}

function ChatMessageBubble({
	message,
}: {
	message: ChatMessageRecord;
}): ReactElement {
	const isUser = message.role === "user";
	const isError = message.kind === "error";
	return (
		<article
			className={cn(
				"grid max-w-[min(42rem,90%)] gap-2 rounded-md border px-3 py-2 text-sm",
				isUser
					? "justify-self-end border-zinc-700 bg-zinc-800 text-zinc-100"
					: "justify-self-start border-zinc-800 bg-[#17181c] text-zinc-200",
				isError && "border-red-900/60 bg-red-950/30 text-red-100",
			)}
		>
			<div className="flex items-center gap-2 text-xs text-zinc-500">
				{message.kind === "task" ? <CheckCircle2 size={14} /> : null}
				{isError ? <CircleAlert size={14} /> : null}
				<span>{message.role}</span>
				<span>{message.kind}</span>
			</div>
			<p className="m-0 whitespace-pre-wrap leading-6">{message.content}</p>
			{message.taskId ? (
				<a
					className="text-sm font-medium text-blue-300 underline-offset-4 hover:underline"
					href={`/issues/${encodeURIComponent(message.taskId)}`}
				>
					Open task
				</a>
			) : null}
		</article>
	);
}

function ClarificationBox({
	answers,
	pendingQuestionIndex,
	questions,
	onAnswerChange,
	onSubmit,
}: {
	answers: string[];
	pendingQuestionIndex: number;
	questions: TaskClarificationQuestion[];
	onAnswerChange: (index: number, value: string) => void;
	onSubmit: () => void;
}): ReactElement {
	const step = resolveClarificationStep(questions, pendingQuestionIndex);
	const canSubmit =
		step.currentQuestion !== null &&
		Boolean(answers[step.currentIndex]?.trim());
	return (
		<div className="grid gap-3 justify-self-start rounded-md border border-zinc-800 bg-[#17181c] p-3">
			{step.currentQuestion ? (
				<label
					className="grid gap-1.5 text-sm"
					htmlFor={`clarification-answer-${step.currentIndex}`}
					key={step.currentQuestion.question}
				>
					<span className="text-zinc-300">{step.currentQuestion.question}</span>
					{step.currentQuestion.options?.length ? (
						<div className="flex flex-wrap gap-2">
							{step.currentQuestion.options.map((option) => (
								<Button
									key={option.value}
									onClick={() =>
										onAnswerChange(step.currentIndex, option.value)
									}
									size="sm"
									type="button"
									variant={
										answers[step.currentIndex] === option.value
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
						className="w-[min(36rem,78vw)]"
						id={`clarification-answer-${step.currentIndex}`}
						onChange={(event) =>
							onAnswerChange(step.currentIndex, event.target.value)
						}
						placeholder="Type a custom answer"
						value={answers[step.currentIndex] ?? ""}
					/>
				</label>
			) : null}
			<Button
				className="justify-self-end"
				disabled={!canSubmit}
				onClick={onSubmit}
				type="button"
			>
				{step.isFinalStep ? "Submit" : "Next"}
			</Button>
		</div>
	);
}

function StatusLine({ text }: { text: string }): ReactElement {
	return <p className="m-0 text-sm text-zinc-500">{text}</p>;
}

function ErrorLine({ text }: { text: string }): ReactElement {
	return (
		<p className="m-0 rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-100">
			{text}
		</p>
	);
}

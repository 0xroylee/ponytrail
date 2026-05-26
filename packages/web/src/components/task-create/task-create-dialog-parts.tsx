"use client";

import { CheckCircle2, Send, X } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import type { TaskCreateChatState } from "./types/task-create-chat-dialog.types";

interface TaskCreateDialogHeaderProps {
	statusText: string;
	onClose: () => void;
}

export function TaskCreateDialogHeader({
	statusText,
	onClose,
}: TaskCreateDialogHeaderProps): ReactElement {
	return (
		<DialogHeader className="flex-row items-start justify-between gap-4 space-y-0 text-left">
			<div>
				<Typography className="mb-1" variant="eyebrow">
					New Issue
				</Typography>
				<DialogTitle>Chat to create a task</DialogTitle>
				<Typography className="mt-2 text-zinc-400">{statusText}</Typography>
			</div>
			<Button
				aria-label="Close dialog"
				onClick={onClose}
				size="iconLg"
				type="button"
				variant="secondary"
			>
				<X size={17} />
			</Button>
		</DialogHeader>
	);
}

interface TaskCreateDialogFieldsProps {
	isStreaming: boolean;
	state: TaskCreateChatState;
	onStateChange: (state: TaskCreateChatState) => void;
}

export function TaskCreateDialogFields({
	isStreaming,
	state,
	onStateChange,
}: TaskCreateDialogFieldsProps): ReactElement {
	const disabled = state.step === "created" || isStreaming;
	return (
		<div className="grid gap-3">
			<Typography
				as="label"
				className="grid gap-1.5 text-zinc-400"
				htmlFor="task-create-chat-request"
				variant="label"
			>
				<Typography as="span" className="text-zinc-400" variant="label">
					Request
				</Typography>
				<Textarea
					className="min-h-32 resize-y"
					disabled={disabled}
					id="task-create-chat-request"
					onChange={(event) =>
						onStateChange({ ...state, request: event.target.value })
					}
					placeholder="Describe the issue or task you want created"
					value={state.request}
				/>
			</Typography>
			<Typography
				as="label"
				className="grid gap-1.5 text-zinc-400"
				htmlFor="task-create-chat-project-id"
				variant="label"
			>
				<Typography as="span" className="text-zinc-400" variant="label">
					Project ID
				</Typography>
				<Input
					disabled={disabled}
					id="task-create-chat-project-id"
					onChange={(event) =>
						onStateChange({ ...state, projectId: event.target.value })
					}
					placeholder="default"
					value={state.projectId}
				/>
			</Typography>
		</div>
	);
}

export function TaskCreateDialogResult({
	state,
}: {
	state: TaskCreateChatState;
}): ReactElement | null {
	if (!state.result) {
		return null;
	}
	return (
		<div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100">
			<CheckCircle2 size={16} />
			<a
				className="font-medium underline-offset-4 hover:underline"
				href={`#${state.result.task.id}`}
				rel="noreferrer"
			>
				{state.result.task.taskKey}
			</a>
			<Typography as="span" variant="success">
				Board task {state.result.task.id}
			</Typography>
		</div>
	);
}

interface TaskCreateDialogFooterProps {
	canSubmitAnswers: boolean;
	canSubmitRequest: boolean;
	isFinalClarificationStep: boolean;
	step: TaskCreateChatState["step"];
	onClose: () => void;
	onPrimary: () => void;
}

export function TaskCreateDialogFooter({
	canSubmitAnswers,
	canSubmitRequest,
	isFinalClarificationStep,
	step,
	onClose,
	onPrimary,
}: TaskCreateDialogFooterProps): ReactElement {
	const disabled =
		step === "clarifying" ? !canSubmitAnswers : !canSubmitRequest;
	return (
		<footer className="flex flex-wrap items-center justify-between gap-3">
			<div />
			<div className="flex items-center gap-2">
				<Button onClick={onClose} type="button" variant="secondary">
					Close
				</Button>
				{step !== "created" ? (
					<Button
						className={cn(disabled && "opacity-50")}
						disabled={disabled}
						onClick={onPrimary}
						type="button"
					>
						<Send size={15} />
						{step === "clarifying"
							? isFinalClarificationStep
								? "Submit Answer"
								: "Next"
							: "Create"}
					</Button>
				) : null}
			</div>
		</footer>
	);
}

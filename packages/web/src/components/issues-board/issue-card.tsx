"use client";

import { Bot, CheckCircle2, GripVertical } from "lucide-react";
import {
	type DragEvent,
	type KeyboardEvent,
	type MouseEvent,
	type PointerEvent,
	type ReactElement,
	useRef,
} from "react";

import type { ProjectBoardTaskRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { getPriorityLabel, isAgentTask } from "./issues-board-utils";

interface IssueCardProps {
	isDragged: boolean;
	task: ProjectBoardTaskRecord;
	onDragEnd: () => void;
	onDragStart: (task: ProjectBoardTaskRecord) => void;
	onOpenContextMenu: (
		task: ProjectBoardTaskRecord,
		position: { x: number; y: number },
	) => void;
	onOpenIssue: (task: ProjectBoardTaskRecord) => void;
	onPointerDrop: (task: ProjectBoardTaskRecord, status: string) => void;
}

export function IssueCard({
	isDragged,
	task,
	onDragEnd,
	onDragStart,
	onOpenContextMenu,
	onOpenIssue,
	onPointerDrop,
}: IssueCardProps): ReactElement {
	const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
	const draggedRef = useRef(false);

	function handlePointerDown(event: PointerEvent<HTMLButtonElement>): void {
		pointerStartRef.current = { x: event.clientX, y: event.clientY };
	}

	function handlePointerUp(event: PointerEvent<HTMLButtonElement>): void {
		const start = pointerStartRef.current;
		pointerStartRef.current = null;
		if (
			!start ||
			Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8
		) {
			return;
		}
		draggedRef.current = true;
		const target = document
			.elementFromPoint(event.clientX, event.clientY)
			?.closest<HTMLElement>("[data-issue-status]");
		const status = target?.dataset.issueStatus;
		if (status) {
			onPointerDrop(task, status);
		}
		window.setTimeout(() => {
			draggedRef.current = false;
		}, 0);
	}

	function handleDragStart(event: DragEvent<HTMLSpanElement>): void {
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", task.id);
		onDragStart(task);
	}

	function handleDragEnd(): void {
		window.setTimeout(() => {
			draggedRef.current = false;
		}, 0);
		onDragEnd();
	}

	function handleCardClick(): void {
		if (!draggedRef.current) {
			onOpenIssue(task);
		}
	}

	function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleCardClick();
		}
	}

	function handleContextMenu(event: MouseEvent<HTMLButtonElement>): void {
		event.preventDefault();
		onOpenContextMenu(task, { x: event.clientX, y: event.clientY });
	}

	return (
		<button
			className={cn(
				"w-full rounded-lg border border-border bg-surface-raised p-2.5 text-left shadow-sm transition hover:border-zinc-700",
				isDragged && "opacity-50 ring-2 ring-zinc-600",
			)}
			onClick={handleCardClick}
			onContextMenu={handleContextMenu}
			onKeyDown={handleKeyDown}
			onPointerDown={handlePointerDown}
			onPointerUp={handlePointerUp}
			type="button"
		>
			<div className="mb-2 flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
				<span className="truncate">{task.taskKey}</span>
				<span
					aria-label={`Drag ${task.taskKey}`}
					className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-surface-active hover:text-zinc-200"
					draggable
					onDragEnd={handleDragEnd}
					onDragStart={handleDragStart}
					role="presentation"
				>
					<GripVertical aria-hidden="true" size={14} />
				</span>
			</div>
			<h3 className="m-0 line-clamp-2 text-sm font-semibold text-zinc-100">
				{task.title}
			</h3>
			{task.content.trim() ? (
				<p className="mb-2 mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
					{task.content}
				</p>
			) : null}
			<div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
				<span className="rounded-md bg-surface-active px-2 py-1">
					{getPriorityLabel(task.priority)}
				</span>
				<span className="rounded-md bg-surface-active px-2 py-1">
					{task.assigneeId ?? task.creatorId}
				</span>
				{isAgentTask(task) ? <Bot size={14} /> : <CheckCircle2 size={14} />}
			</div>
		</button>
	);
}

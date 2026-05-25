"use client";

import type { ReactElement } from "react";

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useBoardTaskQuery } from "@/lib/api/queries";

import { IssueActivityPanel } from "../issues-board/issue-activity";
import { IssueDetailEditor } from "../issues-board/issue-detail-editor";
import type { ChatTaskDetailSheetProps } from "./types/chat-room.types";

export function ChatTaskDetailSheet({
	isOpen,
	taskId,
	onClose,
}: ChatTaskDetailSheetProps): ReactElement {
	const taskQuery = useBoardTaskQuery(taskId ?? "", {
		enabled: isOpen && Boolean(taskId),
		refetchIntervalMs: false,
	});

	return (
		<Sheet open={isOpen && Boolean(taskId)} onOpenChange={handleOpenChange}>
			<SheetContent aria-describedby={undefined}>
				<SheetHeader className="border-b border-zinc-800 px-5 py-4 pr-12">
					<SheetTitle>Task details</SheetTitle>
				</SheetHeader>
				<div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
					{renderSheetContent(taskQuery, taskId)}
				</div>
			</SheetContent>
		</Sheet>
	);

	function handleOpenChange(open: boolean): void {
		if (!open) {
			onClose();
		}
	}
}

function renderSheetContent(
	taskQuery: ReturnType<typeof useBoardTaskQuery>,
	taskId: string | null,
): ReactElement {
	if (!taskId) {
		return <SheetState label="Task not found" />;
	}
	if (taskQuery.isLoading) {
		return <SheetState label="Loading task" />;
	}
	if (taskQuery.error) {
		return <SheetState label={taskQuery.error.message} />;
	}
	if (!taskQuery.data) {
		return <SheetState label="Task not found" />;
	}
	return (
		<div className="grid gap-5">
			<IssueDetailEditor task={taskQuery.data} />
			<IssueActivityPanel task={taskQuery.data} />
		</div>
	);
}

function SheetState({ label }: { label: string }): ReactElement {
	return (
		<div className="grid min-h-64 place-items-center rounded-lg border border-zinc-800 bg-[#18191d] text-sm text-zinc-500">
			{label}
		</div>
	);
}

"use client";

import { FileText, PanelLeft } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import type { ChatRoomHeaderProps } from "./types/chat-room.types";

export function ChatRoomHeader({
	activeTaskId,
	isTaskDetailPanelOpen,
	projectId,
	sidebarControlId,
	title,
	onToggleTaskDetails,
}: ChatRoomHeaderProps): ReactElement {
	return (
		<header className="flex items-center justify-between gap-3 bg-surface-inset px-4 py-3">
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<Button
					asChild
					className="cursor-pointer md:hidden"
					size="icon"
					variant="ghost"
				>
					<label aria-label="Open chat sidebar" htmlFor={sidebarControlId}>
						<PanelLeft size={17} />
					</label>
				</Button>
				<div className="min-w-0">
					<h1 className="m-0 truncate text-base font-medium text-zinc-300">
						{title}
					</h1>
					<p className="m-0 mt-1 truncate text-xs text-muted-foreground">
						{projectId}
					</p>
				</div>
			</div>
			{activeTaskId ? (
				<Button
					aria-pressed={isTaskDetailPanelOpen}
					className="shrink-0"
					onClick={onToggleTaskDetails}
					type="button"
					variant="secondary"
				>
					<FileText size={16} />
					<span className="hidden sm:inline">Task details</span>
					<span className="sm:hidden">Details</span>
				</Button>
			) : null}
		</header>
	);
}

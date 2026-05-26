"use client";

import { Archive, Pin, PinOff } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import type { ChatRoomSessionRowProps } from "./types/chat-room-sidebar.types";

export function ChatRoomSessionRow({
	activeSessionId,
	isPinned,
	session,
	onArchiveSession,
	onPinSession,
	onSelectSession,
	onUnpinSession,
}: ChatRoomSessionRowProps): ReactElement {
	const pinLabel = isPinned ? `Unpin ${session.title}` : `Pin ${session.title}`;

	function handlePinClick(): void {
		if (isPinned) {
			onUnpinSession(session.id);
			return;
		}
		onPinSession(session.id);
	}

	return (
		<div
			className={cn(
				"group grid min-w-0 grid-cols-[minmax(0,1fr)_2rem_2rem] gap-1 rounded-md hover:bg-surface-active hover:text-zinc-200",
				session.id === activeSessionId
					? "bg-[#111110] text-zinc-100"
					: "text-zinc-400",
			)}
		>
			<Button
				className="h-auto min-w-0 justify-start px-2 py-2 text-left text-sm"
				onClick={() => onSelectSession(session.id)}
				type="button"
				variant="ghost"
			>
				<span className="min-w-0 flex-1">
					<Typography as="span" className="block truncate">
						{session.title}
					</Typography>
				</span>
			</Button>
			<Button
				aria-label={pinLabel}
				aria-pressed={isPinned}
				className={cn(
					"transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
					isPinned ? "opacity-100" : "opacity-0",
				)}
				onClick={handlePinClick}
				size="icon"
				title={isPinned ? "Unpin session" : "Pin session"}
				type="button"
				variant="ghost"
			>
				{isPinned ? <PinOff size={14} /> : <Pin size={14} />}
			</Button>
			<Button
				aria-label={`Archive ${session.title}`}
				className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
				onClick={() => onArchiveSession(session.id)}
				size="icon"
				title="Archive session"
				type="button"
				variant="ghost"
			>
				<Archive size={14} />
			</Button>
		</div>
	);
}

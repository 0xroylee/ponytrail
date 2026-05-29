"use client";

import { Asterisk, PanelLeft } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import type { ChatRoomSidebarHeaderProps } from "./types/chat-room-sidebar.types";

export function ChatRoomSidebarHeader({
	isCollapsed,
	onToggleCollapsed,
}: ChatRoomSidebarHeaderProps): ReactElement {
	const collapseLabel = isCollapsed
		? "Expand chat sidebar"
		: "Collapse chat sidebar";

	return (
		<header
			className={cn(
				"flex min-w-0 items-center gap-3 border-b border-border p-3",
				isCollapsed && "md:grid md:justify-items-center md:gap-2",
			)}
		>
			<div
				className={cn(
					"flex min-w-0 flex-1 items-center gap-2",
					isCollapsed && "md:w-full md:justify-center",
				)}
			>
				<Asterisk
					aria-hidden="true"
					className="shrink-0 text-[hsl(var(--accent-warm))]"
					size={22}
					strokeWidth={2.4}
				/>
				<Typography
					as="strong"
					className={cn(
						"min-w-0 truncate text-zinc-100",
						isCollapsed && "md:sr-only",
					)}
					variant="cardTitle"
				>
					devos.ing
				</Typography>
			</div>
			<Button
				aria-label={collapseLabel}
				className="hidden shrink-0 md:inline-flex"
				onClick={onToggleCollapsed}
				size="icon"
				title={collapseLabel}
				type="button"
				variant="ghost"
			>
				<PanelLeft
					className={cn("transition-transform", isCollapsed && "rotate-180")}
					size={16}
				/>
			</Button>
		</header>
	);
}

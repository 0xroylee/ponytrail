"use client";

import type { MouseEvent, ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { getChatCommandSuggestions } from "./chat-command-utils";

type ChatCommandSuggestion = ReturnType<
	typeof getChatCommandSuggestions
>[number];

interface ChatCommandMenuProps {
	activeIndex: number;
	menuId: string;
	suggestions: ChatCommandSuggestion[];
	onPointerDown: (event: MouseEvent<HTMLButtonElement>) => void;
	onSelectCommand: (command: string) => void;
}

export function ChatCommandMenu({
	activeIndex,
	menuId,
	suggestions,
	onPointerDown,
	onSelectCommand,
}: ChatCommandMenuProps): ReactElement {
	return (
		<div
			aria-label="Chat commands"
			className="absolute bottom-full mb-2 grid max-h-72 w-full gap-1 overflow-y-auto rounded-md border border-border bg-surface-panel p-2"
			id={menuId}
		>
			{suggestions.length > 0 ? (
				suggestions.map((item, index) => {
					const isSelected = index === activeIndex;
					return (
						<Button
							aria-selected={isSelected}
							className={cn(
								"flex min-h-10 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm text-zinc-300 hover:bg-surface-active",
								isSelected && "bg-surface-active text-zinc-100",
							)}
							id={commandOptionId(menuId, item.command)}
							key={item.command}
							onClick={() => onSelectCommand(item.command)}
							onMouseDown={onPointerDown}
							type="button"
							variant="ghost"
						>
							<span className="font-mono text-zinc-100">{item.command}</span>
							<span className="min-w-0 truncate text-xs text-muted-foreground">
								{item.hint}
							</span>
						</Button>
					);
				})
			) : (
				<p className="m-0 px-2 py-3 text-sm text-muted-foreground">
					No commands
				</p>
			)}
		</div>
	);
}

export function commandOptionId(menuId: string, command: string): string {
	return `${menuId}-${command.slice(1)}`;
}

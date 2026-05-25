"use client";

import { cn } from "@/lib/utils";
import type { ReactElement } from "react";
import type {
	TaskCreateChatState,
	TaskCreateLogLine,
} from "./types/task-create-chat-dialog.types";

export function TaskCreateLogPanel({
	logs,
}: {
	logs: TaskCreateLogLine[];
}): ReactElement | null {
	if (logs.length === 0) {
		return null;
	}
	return (
		<div className="grid max-h-52 gap-1 overflow-auto rounded-lg border border-border bg-surface-inset p-3 font-mono text-xs text-zinc-300">
			{logs.map((line) => (
				<p
					className={cn(
						"m-0 whitespace-pre-wrap break-words",
						line.stream === "stderr" && "text-amber-200",
						line.stream === "system" && "text-muted-foreground",
					)}
					key={line.id}
				>
					{line.text}
				</p>
			))}
		</div>
	);
}

export function createLogLine(
	stream: "stdout" | "stderr" | "system",
	text: string,
): TaskCreateChatState["logs"][number] {
	return {
		id: crypto.randomUUID(),
		stream,
		text,
	};
}

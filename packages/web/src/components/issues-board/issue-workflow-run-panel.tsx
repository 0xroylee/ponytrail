"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import type { IssueWorkflowRunState } from "./use-issue-workflow-run";

export function IssueWorkflowRunPanel({
	runState,
	onClose,
}: {
	runState: IssueWorkflowRunState;
	onClose: () => void;
}): ReactElement | null {
	if (runState.status === "idle") {
		return null;
	}
	const isRunning = runState.status === "running";
	const hasFailed =
		runState.status === "failed" || runState.status === "rejected";
	const StatusIcon = isRunning ? Loader2 : hasFailed ? XCircle : CheckCircle2;

	return (
		<section className="fixed right-5 bottom-5 z-30 grid w-[min(32rem,calc(100vw-2rem))] gap-3 rounded-lg border border-border bg-surface-panel p-4 text-zinc-100 shadow-2xl">
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<StatusIcon
							className={cn(
								isRunning && "animate-spin",
								hasFailed && "text-red-300",
							)}
							size={17}
						/>
						<Typography variant="cardTitle">Workflow Run</Typography>
					</div>
					<Typography className="mt-1 truncate" variant="muted">
						{runState.task
							? `${runState.task.taskKey} · ${runState.task.title}`
							: "No issue selected"}
					</Typography>
				</div>
				{isRunning ? null : (
					<Button
						aria-label="Close workflow run panel"
						onClick={onClose}
						size="icon"
						type="button"
						variant="ghost"
					>
						<XCircle size={16} />
					</Button>
				)}
			</header>
			<div className="grid max-h-56 gap-1 overflow-auto rounded-md border border-border bg-surface-inset p-3 font-mono text-xs text-zinc-300">
				{runState.logs.map((line) => (
					<Typography
						className={cn(
							"whitespace-pre-wrap break-words",
							line.stream === "stderr" && "text-amber-200",
							line.stream === "system" && "text-muted-foreground",
							line.stream === "progress" && "text-sky-200",
						)}
						key={line.id}
						variant="mono"
					>
						{line.text}
					</Typography>
				))}
			</div>
		</section>
	);
}

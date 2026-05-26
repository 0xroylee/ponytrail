"use client";

import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import type { ReactElement, ReactNode } from "react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import type {
	ChatMissionExecution,
	ChatMissionLogLine,
	ChatMissionResult,
} from "./types/chat-mission-progress.types";

export function MissionSection({
	children,
	icon,
	name,
	title,
}: {
	children: ReactNode;
	icon: ReactElement;
	name: string;
	title: string;
}): ReactElement {
	return (
		<section
			className="grid gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0"
			data-mission-section={name}
		>
			<SectionTitle icon={icon} title={title} />
			<div className="border-l border-border bg-surface-inset/70 py-2 pl-3 pr-2">
				{children}
			</div>
		</section>
	);
}

export function ExecutionHeader({
	execution,
}: {
	execution: ChatMissionExecution;
}): ReactElement {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<Typography variant="eyebrow">{execution.title}</Typography>
			{execution.status ? (
				<Typography variant="muted">{execution.status}</Typography>
			) : null}
		</div>
	);
}

export function MissionStep({
	step,
}: {
	step: ChatMissionExecution["steps"][number];
}): ReactElement {
	const detail = formatStepDetail(step.detail);
	return (
		<div className="grid gap-1 bg-surface-inset px-2 py-1.5">
			<div className="flex flex-wrap justify-between gap-2">
				<Typography as="span" className="text-zinc-200" variant="cardTitle">
					{step.action}
				</Typography>
				<Typography variant="muted">{step.status}</Typography>
			</div>
			{detail ? (
				<Typography className="leading-5" variant="muted">
					{detail}
				</Typography>
			) : null}
		</div>
	);
}

export function MissionLogLine({
	line,
}: {
	line: ChatMissionLogLine;
}): ReactElement {
	return (
		<Typography
			className={cn(
				"whitespace-pre-wrap break-words",
				line.stream === "stderr" && "text-red-200",
				line.stream === "system" && "text-muted-foreground",
			)}
			variant="mono"
		>
			{line.text}
		</Typography>
	);
}

export function ResultIcon({
	tone,
}: {
	tone: ChatMissionResult["tone"];
}): ReactElement {
	if (tone === "running") {
		return <Loader2 className="animate-spin text-zinc-400" size={15} />;
	}
	if (tone === "warning") {
		return <CircleAlert className="text-amber-300" size={15} />;
	}
	if (tone === "error") {
		return <CircleAlert className="text-red-300" size={15} />;
	}
	if (tone === "neutral") {
		return <CircleAlert className="text-zinc-400" size={15} />;
	}
	return <CheckCircle2 className="text-emerald-300" size={15} />;
}

function SectionTitle({
	icon,
	title,
}: {
	icon: ReactElement;
	title: string;
}): ReactElement {
	return (
		<Typography className="flex items-center gap-2" variant="eyebrow">
			{icon}
			<Typography as="span" variant="eyebrow">
				{title}
			</Typography>
		</Typography>
	);
}

function formatStepDetail(detail: string | null): string {
	if (!detail) return "";
	try {
		const parsed = JSON.parse(detail) as Record<string, unknown>;
		for (const key of ["message", "detail", "error"]) {
			const value = parsed[key];
			if (typeof value === "string" && value.trim()) return value;
		}
	} catch {
		return detail;
	}
	return "";
}

"use client";

import {
	Bot,
	ChevronDown,
	CircleDot,
	MessageSquareText,
	MoreHorizontal,
} from "lucide-react";
import type { ReactElement } from "react";

import { Typography } from "@/components/ui/typography";
import type { ProjectBoardTaskRecord, TaskActivityRecord } from "@/lib/api";
import { isApiRequestError } from "@/lib/api";
import { useTaskActivityQuery } from "@/lib/api/task-activity-query";

import { ActivityRichText } from "./issue-activity-rich-text";
import { createTaskCreatedActivity } from "./issue-activity-utils";

export function IssueActivityPanel({
	task,
}: {
	task: ProjectBoardTaskRecord;
}): ReactElement {
	const activityQuery = useTaskActivityQuery(task.id);

	return (
		<section className="grid gap-4">
			<header className="flex items-center justify-between gap-3">
				<Typography variant="pageTitle">Activity</Typography>
			</header>
			{renderActivityContent(activityQuery, task)}
		</section>
	);
}

function renderActivityContent(
	activityQuery: ReturnType<typeof useTaskActivityQuery>,
	task: ProjectBoardTaskRecord,
): ReactElement {
	if (activityQuery.isLoading) {
		return <ActivityState label="Loading activity" />;
	}
	if (activityQuery.error) {
		if (
			isApiRequestError(activityQuery.error) &&
			activityQuery.error.status === 404
		) {
			return <ActivityList activities={[createTaskCreatedActivity(task)]} />;
		}
		return <ActivityState label={activityQuery.error.message} />;
	}
	const activities = activityQuery.data?.activities ?? [];
	if (activities.length === 0) {
		return <ActivityState label="No activity yet" />;
	}
	return <ActivityList activities={activities} />;
}

function ActivityList({
	activities,
}: {
	activities: TaskActivityRecord[];
}): ReactElement {
	return (
		<div className="grid gap-3">
			<div className="flex h-8 items-center gap-2 rounded-md border border-zinc-700 bg-surface-inset px-2 text-sm text-zinc-400">
				<ChevronDown size={16} />
				<Typography variant="metadata">
					{formatCount(activities.length)}
				</Typography>
			</div>
			<div className="grid gap-3">
				{activities.map((activity) => (
					<ActivityItem activity={activity} key={activity.id} />
				))}
			</div>
		</div>
	);
}

function ActivityItem({
	activity,
}: {
	activity: TaskActivityRecord;
}): ReactElement {
	const hasCard = Boolean(activity.body.trim()) || activity.steps?.length;
	if (hasCard) {
		return <ActivityCard activity={activity} />;
	}
	return (
		<div className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 text-sm text-zinc-400">
			<ActivityIcon activity={activity} />
			<Typography className="min-w-0" variant="metadata">
				<Typography as="span" className="text-zinc-300" variant="cardTitle">
					{activity.actorId}
				</Typography>{" "}
				{activity.title}
			</Typography>
			<Typography as="time" className="whitespace-nowrap" variant="description">
				{formatRelativeTime(activity.createdAt)}
			</Typography>
		</div>
	);
}

function ActivityCard({
	activity,
}: {
	activity: TaskActivityRecord;
}): ReactElement {
	return (
		<article className="rounded-lg border border-border bg-card p-5">
			<header className="mb-5 flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<ActivityIcon activity={activity} isLarge />
					<div className="min-w-0">
						<Typography className="truncate">
							<Typography as="span" variant="cardTitle">
								{activity.actorId}
							</Typography>{" "}
							<Typography as="span" variant="description">
								{formatRelativeTime(activity.createdAt)}
							</Typography>
						</Typography>
						<Typography variant="muted">{activity.title}</Typography>
					</div>
				</div>
				<MoreHorizontal className="text-muted-foreground" size={18} />
			</header>
			{activity.body.trim() ? <ActivityRichText body={activity.body} /> : null}
			{activity.steps?.length ? <ActivitySteps activity={activity} /> : null}
		</article>
	);
}

function ActivitySteps({
	activity,
}: {
	activity: TaskActivityRecord;
}): ReactElement {
	return (
		<div className="mt-4 grid gap-2 border-t border-border pt-4">
			{activity.steps?.map((step) => (
				<div
					className="grid gap-1 rounded-md border border-border/70 bg-surface-input px-3 py-2 text-sm"
					key={step.id}
				>
					<div className="flex items-center justify-between gap-3">
						<Typography as="span" className="text-zinc-200" variant="cardTitle">
							{step.action}
						</Typography>
						<Typography variant="muted">{step.status}</Typography>
					</div>
					{step.detail ? (
						<Typography variant="description">{step.detail}</Typography>
					) : null}
				</div>
			))}
		</div>
	);
}

function ActivityIcon({
	activity,
	isLarge = false,
}: {
	activity: TaskActivityRecord;
	isLarge?: boolean;
}): ReactElement {
	const size = isLarge ? "h-8 w-8" : "h-5 w-5";
	const iconSize = isLarge ? 16 : 12;
	const Icon =
		activity.kind === "created"
			? CircleDot
			: activity.actorType === "agent"
				? Bot
				: MessageSquareText;
	return (
		<span
			className={`${size} grid shrink-0 place-items-center rounded-full bg-surface-active text-zinc-400`}
		>
			<Icon size={iconSize} />
		</span>
	);
}

function ActivityState({ label }: { label: string }): ReactElement {
	return (
		<div className="grid min-h-32 place-items-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
			<Typography variant="description">{label}</Typography>
		</div>
	);
}

function formatCount(count: number): string {
	return count === 1 ? "1 activity" : `${count} activities`;
}

function formatRelativeTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
	const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
		["day", 86400],
		["hour", 3600],
		["minute", 60],
	];
	const formatter = new Intl.RelativeTimeFormat(undefined, {
		numeric: "auto",
	});
	for (const [unit, seconds] of units) {
		if (Math.abs(diffSeconds) >= seconds) {
			return formatter.format(Math.round(diffSeconds / seconds), unit);
		}
	}
	return formatter.format(diffSeconds, "second");
}

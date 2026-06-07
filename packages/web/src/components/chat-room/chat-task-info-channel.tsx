"use client";

import {
	Bot,
	CalendarDays,
	Circle,
	Clock3,
	GitPullRequest,
	Hash,
	UserRound,
} from "lucide-react";
import type { ReactElement } from "react";

import { Typography } from "@/components/ui/typography";
import type { ProjectBoardTaskRecord, TokenUsageRecord } from "@/lib/api";
import { useBoardTaskQuery, useTokenUsageQuery } from "@/lib/api/queries";

import { IssueActivityPanel } from "../issues-board/issue-activity";
import {
	ExternalLinkValue,
	formatDateTime,
} from "../issues-board/issue-detail-editor-utils";
import {
	MetricRow,
	PanelSection,
	PanelState,
	PropertyRow,
} from "../issues-board/issue-task-detail-panel-parts";
import {
	formatDueDate,
	summarizeTokenUsage,
} from "../issues-board/issue-task-detail-panel-utils";
import {
	getPriorityLabel,
	getStatusLabel,
	isAgentTask,
} from "../issues-board/issues-board-utils";
import { MissionBody } from "./chat-mission-progress-sections";
import type { ChatMissionProgressViewModel } from "./types/chat-mission-progress.types";

interface ChatTaskInfoChannelProps {
	missionProgress: ChatMissionProgressViewModel | null;
	taskId: string | null;
}

type TaskInfoSectionProps = { task: ProjectBoardTaskRecord };

export function ChatTaskInfoChannel({
	missionProgress,
	taskId,
}: ChatTaskInfoChannelProps): ReactElement {
	const isEnabled = Boolean(taskId);
	const taskQuery = useBoardTaskQuery(taskId ?? "", {
		enabled: isEnabled,
		refetchIntervalMs: false,
	});
	const usageQuery = useTokenUsageQuery({
		enabled: isEnabled,
		refetchIntervalMs: false,
	});
	const usageRecords = (usageQuery.data ?? []).filter(
		(record) => record.taskId === taskId,
	);

	if (!taskId) {
		return <TaskInfoState label="No linked task" />;
	}
	if (taskQuery.isLoading) {
		return <TaskInfoState label="Loading task" />;
	}
	if (taskQuery.error) {
		return <TaskInfoState label={taskQuery.error.message} />;
	}
	if (!taskQuery.data) {
		return <TaskInfoState label="Task not found" />;
	}

	return (
		<div className="min-h-0 overflow-y-auto px-4 py-5">
			<div className="mx-auto grid w-full max-w-4xl gap-5">
				<TaskInfoHeader task={taskQuery.data} />
				<TaskInfoProperties task={taskQuery.data} />
				{missionProgress ? <MissionBody mission={missionProgress} /> : null}
				<TaskInfoUsage
					isLoading={usageQuery.isLoading}
					records={usageRecords}
				/>
				<IssueActivityPanel task={taskQuery.data} />
			</div>
		</div>
	);
}

function TaskInfoHeader({ task }: TaskInfoSectionProps): ReactElement {
	return (
		<section className="grid gap-3 rounded-md border border-border bg-card p-5">
			<Typography variant="eyebrow">{task.taskKey}</Typography>
			<Typography className="break-words text-xl leading-7" variant="pageTitle">
				{task.title}
			</Typography>
			<Typography className="whitespace-pre-wrap break-words leading-6 text-zinc-400">
				{task.content.trim() || "No description"}
			</Typography>
		</section>
	);
}

function TaskInfoProperties({ task }: TaskInfoSectionProps): ReactElement {
	const AssigneeIcon = isAgentTask(task) ? Bot : UserRound;
	return (
		<PanelSection title="Properties">
			<PropertyRow icon={<Circle size={17} />} label="Status">
				{getStatusLabel(task.status)}
			</PropertyRow>
			<PropertyRow icon={<AssigneeIcon size={17} />} label="Assignee">
				{task.assigneeId ?? task.creatorId}
			</PropertyRow>
			<PropertyRow icon={<Hash size={17} />} label="Priority">
				{getPriorityLabel(task.priority)}
			</PropertyRow>
			<PropertyRow icon={<CalendarDays size={17} />} label="Due date">
				{formatDueDate(task.dueDate)}
			</PropertyRow>
			<PropertyRow icon={<GitPullRequest size={17} />} label="Pull request">
				{task.linkedPr ? (
					<ExternalLinkValue href={task.linkedPr} />
				) : (
					"No linked pull request"
				)}
			</PropertyRow>
			<PropertyRow icon={<UserRound size={17} />} label="Created by">
				{task.creatorId}
			</PropertyRow>
			<PropertyRow icon={<Clock3 size={17} />} label="Created">
				{formatDateTime(task.createdAt)}
			</PropertyRow>
			<PropertyRow icon={<Clock3 size={17} />} label="Updated">
				{formatDateTime(task.updatedAt)}
			</PropertyRow>
		</PanelSection>
	);
}

function TaskInfoUsage({
	isLoading,
	records,
}: {
	isLoading: boolean;
	records: TokenUsageRecord[];
}): ReactElement {
	const summary = summarizeTokenUsage(records);
	return (
		<PanelSection title="Token usage">
			{isLoading ? (
				<Typography variant="description">Loading usage</Typography>
			) : records.length === 0 ? (
				<Typography variant="description">No token usage yet</Typography>
			) : (
				<>
					<MetricRow label="Input" value={summary.inputTokens} />
					<MetricRow label="Output" value={summary.outputTokens} />
					<MetricRow label="Total" value={summary.totalTokens} />
					<MetricRow label="Runs" value={summary.runs} />
				</>
			)}
		</PanelSection>
	);
}

function TaskInfoState({ label }: { label: string }): ReactElement {
	return (
		<div className="grid min-h-0 flex-1 place-items-center px-6 py-10 text-sm text-muted-foreground">
			<PanelState label={label} />
		</div>
	);
}

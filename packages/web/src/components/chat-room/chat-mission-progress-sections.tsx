"use client";

import { ListChecks, Radio, ScrollText, Terminal } from "lucide-react";
import type { ReactElement } from "react";

import {
	ExecutionHeader,
	MissionLogLine,
	MissionSection,
	MissionStep,
	ResultIcon,
} from "./chat-mission-progress-section-parts";

import type {
	ChatMissionExecution,
	ChatMissionNote,
	ChatMissionProgressViewModel,
	ChatMissionResult,
} from "./types/chat-mission-progress.types";

export function MissionBody({
	mission,
}: {
	mission: ChatMissionProgressViewModel;
}): ReactElement {
	return (
		<div className="grid gap-4">
			<StatusSection mission={mission} />
			<NotesSection notes={mission.notes} />
			<StepsSection executions={mission.executions} />
			<LogsSection executions={mission.executions} />
			<ResultSection result={mission.latestResult} />
		</div>
	);
}

function StatusSection({
	mission,
}: {
	mission: ChatMissionProgressViewModel;
}): ReactElement {
	return (
		<MissionSection icon={<Radio size={14} />} name="status" title="Status">
			<div className="flex flex-wrap items-center gap-2">
				<span className="rounded-sm border border-zinc-700 bg-surface-inset px-2 py-1 text-xs font-medium text-zinc-200">
					{mission.statusLabel}
				</span>
				{mission.taskKey ? (
					<span className="text-xs text-muted-foreground">
						{mission.taskKey}
					</span>
				) : null}
			</div>
		</MissionSection>
	);
}

function NotesSection({
	notes,
}: {
	notes: ChatMissionNote[];
}): ReactElement | null {
	if (notes.length === 0) return null;
	return (
		<MissionSection
			icon={<ScrollText size={14} />}
			name="plan-updates"
			title="Plan & updates"
		>
			<div className="grid gap-3">
				{notes.map((note) => (
					<article className="grid gap-1" key={note.id}>
						<p className="m-0 text-xs text-muted-foreground">
							{note.actorId} · {note.title}
						</p>
						<p className="m-0 whitespace-pre-wrap leading-6 text-zinc-300">
							{note.body}
						</p>
					</article>
				))}
			</div>
		</MissionSection>
	);
}

function StepsSection({
	executions,
}: {
	executions: ChatMissionExecution[];
}): ReactElement | null {
	const executionsWithSteps = executions.filter(
		(execution) => execution.steps.length > 0,
	);
	if (executionsWithSteps.length === 0) return null;
	return (
		<MissionSection
			icon={<ListChecks size={14} />}
			name="progress-steps"
			title="Progress steps"
		>
			<div className="grid gap-3">
				{executionsWithSteps.map((execution) => (
					<article className="grid gap-2" key={execution.id}>
						<ExecutionHeader execution={execution} />
						<div className="grid gap-1.5">
							{execution.steps.map((step) => (
								<MissionStep key={step.id} step={step} />
							))}
						</div>
					</article>
				))}
			</div>
		</MissionSection>
	);
}

function LogsSection({
	executions,
}: {
	executions: ChatMissionExecution[];
}): ReactElement | null {
	const executionsWithLogs = executions.filter(
		(execution) => execution.logLines.length > 0,
	);
	if (executionsWithLogs.length === 0) return null;
	return (
		<MissionSection
			icon={<Terminal size={14} />}
			name="execution-logs"
			title="Execution logs"
		>
			<div className="grid gap-3">
				{executionsWithLogs.map((execution) => (
					<article className="grid gap-2" key={execution.id}>
						<ExecutionHeader execution={execution} />
						<div className="grid max-h-64 gap-1 overflow-auto bg-surface-inset px-2 py-2 font-mono text-xs text-zinc-300">
							{execution.logLines.map((line) => (
								<MissionLogLine key={line.id} line={line} />
							))}
						</div>
					</article>
				))}
			</div>
		</MissionSection>
	);
}

function ResultSection({
	result,
}: {
	result: ChatMissionResult | null;
}): ReactElement | null {
	if (!result) return null;
	return (
		<MissionSection
			icon={<ResultIcon tone={result.tone} />}
			name="result"
			title="Result"
		>
			<p className="m-0 text-sm text-zinc-300">
				Result:{" "}
				<span className="font-medium text-zinc-100">{result.label}</span>
			</p>
		</MissionSection>
	);
}

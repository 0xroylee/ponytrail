"use client";

import type { ReactElement } from "react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { MissionStatusIcon } from "./chat-mission-progress-status-icon";
import { MissionUsageSummary } from "./chat-mission-usage-summary";
import type {
	ChatMissionGoalAction,
	ChatMissionPhase,
	ChatMissionPhaseStatus,
	ChatMissionProgressViewModel,
	ChatMissionResult,
} from "./types/chat-mission-progress.types";

export function MissionBody({
	mission,
}: {
	mission: ChatMissionProgressViewModel;
}): ReactElement {
	return (
		<div className="grid gap-3">
			<MissionHeader mission={mission} />
			<MissionUsageSummary mission={mission} />
			<MissionActionGraph mission={mission} />
		</div>
	);
}

function MissionHeader({
	mission,
}: {
	mission: ChatMissionProgressViewModel;
}): ReactElement {
	return (
		<header className="flex flex-wrap items-start justify-between gap-3">
			<div className="min-w-0">
				<Typography className="text-muted-foreground" variant="eyebrow">
					Mission
				</Typography>
				<Typography className="mt-1 truncate" variant="sectionTitle">
					Action workflow
				</Typography>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{mission.taskKey ? (
					<Typography
						className="rounded-sm border border-border bg-surface-inset px-2 py-1"
						variant="metadata"
					>
						{mission.taskKey}
					</Typography>
				) : null}
				<Typography
					className="rounded-sm border border-border bg-surface-inset px-2 py-1"
					variant="metadata"
				>
					{mission.statusLabel}
				</Typography>
			</div>
		</header>
	);
}

function MissionActionGraph({
	mission,
}: { mission: ChatMissionProgressViewModel }): ReactElement {
	return (
		<div
			className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)_minmax(0,1fr)]"
			data-mission-action-graph="true"
		>
			<GoalActionNode action={mission.goalAction} />
			<WorkflowPhases phases={mission.phases} />
			<ResultActionNode result={mission.latestResult} />
		</div>
	);
}

function GoalActionNode({
	action,
}: { action: ChatMissionGoalAction }): ReactElement {
	return (
		<div
			className={actionNodeClassName(action.status, "start")}
			data-mission-goal-action="true"
			data-mission-goal-action-status={action.status}
		>
			<NodeTitle label={action.label} status={action.status} />
			<Typography className="min-w-0 break-words" variant="body">
				{action.title}
			</Typography>
			{action.description ? (
				<Typography className="min-w-0 break-words" variant="muted">
					{action.description}
				</Typography>
			) : null}
			{action.metadata.length > 0 ? (
				<Typography className="min-w-0 break-words" variant="metadata">
					{action.metadata.join(" / ")}
				</Typography>
			) : null}
		</div>
	);
}

function WorkflowPhases({
	phases,
}: { phases: ChatMissionPhase[] }): ReactElement {
	const status = resolveWorkflowStatus(phases);
	return (
		<div
			className={actionNodeClassName(status, "middle")}
			data-mission-phase-group="true"
			data-mission-workflow="true"
		>
			<NodeTitle label="Workflow" status={status} />
			<div className="grid gap-2">
				{phases.map((phase) => (
					<PhaseRow key={phase.id} phase={phase} />
				))}
			</div>
		</div>
	);
}

function PhaseRow({
	phase,
}: {
	phase: ChatMissionPhase;
}): ReactElement {
	return (
		<div
			className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
			data-mission-phase={phase.id}
			data-mission-phase-status={phase.status}
		>
			<MissionStatusIcon status={phase.status} />
			<Typography className="min-w-0 truncate" variant="cardTitle">
				{phase.label}
			</Typography>
			<Typography
				className="capitalize text-muted-foreground"
				variant="metadata"
			>
				{phase.status}
			</Typography>
		</div>
	);
}

function ResultActionNode({
	result,
}: {
	result: ChatMissionResult | null;
}): ReactElement {
	const status = resolveResultStatus(result);
	return (
		<div
			className={actionNodeClassName(status, "end")}
			data-mission-result-action="true"
			data-mission-result-action-status={status}
		>
			<NodeTitle label="Result" status={status} />
			<Typography className="capitalize text-muted-foreground" variant="muted">
				{result?.label ?? "Pending"}
			</Typography>
		</div>
	);
}

function NodeTitle({
	label,
	status,
}: {
	label: string;
	status: ChatMissionPhaseStatus;
}): ReactElement {
	return (
		<div className="flex min-w-0 items-center gap-2">
			<MissionStatusIcon status={status} />
			<Typography className="min-w-0 truncate" variant="cardTitle">
				{label}
			</Typography>
		</div>
	);
}

function actionNodeClassName(
	status: ChatMissionPhaseStatus,
	position: "start" | "middle" | "end",
): string {
	return cn(
		"relative grid min-h-24 content-start gap-2 rounded-md border bg-surface-panel px-3 py-3 text-left",
		status === "success" && "border-emerald-900/70",
		status === "failed" && "border-red-900/70 bg-red-950/20",
		status === "running" && "border-sky-900/70",
		status === "warning" && "border-amber-900/70",
		status === "pending" && "border-border",
		position !== "start" &&
			"before:absolute before:-left-2 before:top-1/2 before:hidden before:h-px before:w-2 before:bg-border md:before:block",
		position !== "end" &&
			"after:absolute after:-right-2 after:top-1/2 after:hidden after:h-px after:w-2 after:bg-border md:after:block",
	);
}

function resolveWorkflowStatus(
	phases: ChatMissionPhase[],
): ChatMissionPhaseStatus {
	if (phases.some((phase) => phase.status === "failed")) return "failed";
	if (phases.some((phase) => phase.status === "warning")) return "warning";
	if (phases.some((phase) => phase.status === "running")) return "running";
	if (
		phases.length > 0 &&
		phases.every((phase) => phase.status === "success")
	) {
		return "success";
	}
	if (phases.some((phase) => phase.status === "success")) return "running";
	return "pending";
}

function resolveResultStatus(
	result: ChatMissionResult | null,
): ChatMissionPhaseStatus {
	if (!result) return "pending";
	if (result.tone === "success") return "success";
	if (result.tone === "error") return "failed";
	if (result.tone === "warning") return "warning";
	if (result.tone === "running") return "running";
	return "pending";
}

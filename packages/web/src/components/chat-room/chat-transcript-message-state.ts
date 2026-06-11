import type {
	ChatMessageRecord,
	ChatSessionRecord,
	TaskActivityStepRecord,
} from "@/lib/api";
import {
	formatActionLabel,
	readableSummarySnippet,
	stepDetailText,
	summarySnippet,
} from "./chat-transcript-message-format";
import type {
	ChatMissionPhaseId,
	ChatMissionProgressViewModel,
} from "./types/chat-mission-progress.types";
import type {
	ChatTranscriptRow,
	ChatTranscriptSummaryRow,
	CreateChatTranscriptRowsInput,
} from "./types/chat-transcript-message.types";

const PHASE_RESULT_TITLES = new Map<ChatMissionPhaseId, string>([
	["plan", "Planned result"],
	["implement", "Implement result"],
	["testing", "Testing result"],
]);
const WORKFLOW_STATE_LABELS = new Map<string, string>([
	["brainstorm", "Thinking"],
	["plan", "Planning"],
	["implement", "Processing"],
	["testing", "Testing"],
]);

export function createChatTranscriptRows({
	messages,
	missionProgress,
	session,
}: CreateChatTranscriptRowsInput): ChatTranscriptRow[] {
	return [
		...messages.map((message) => ({ kind: "message" as const, message })),
		...createSummaryRows({ messages, missionProgress, session }),
	];
}

function createSummaryRows({
	messages,
	missionProgress,
	session,
}: CreateChatTranscriptRowsInput): ChatTranscriptSummaryRow[] {
	return [
		createBrainstormResultRow(messages),
		createProcessingRow(missionProgress, session?.workflowState ?? null),
		...createPhaseResultRows(missionProgress),
		...createFileChangeSnapshotRows(missionProgress),
	].filter((row): row is ChatTranscriptSummaryRow => Boolean(row));
}

function createBrainstormResultRow(
	messages: ChatMessageRecord[],
): ChatTranscriptSummaryRow | null {
	const message = [...messages]
		.reverse()
		.find(
			(item) =>
				item.role === "assistant" &&
				(item.kind === "clarification" || item.kind === "task"),
		);
	if (!message) return null;
	const prefix =
		message.kind === "clarification" ? "Needs clarification" : "Ready";
	return {
		body: `${prefix}: ${summarySnippet(message.content)}`,
		id: `summary:brainstorm:${message.id}`,
		kind: "summary",
		title: "Brainstorm result",
	};
}

function createProcessingRow(
	mission: ChatMissionProgressViewModel | null | undefined,
	workflowState: ChatSessionRecord["workflowState"],
): ChatTranscriptSummaryRow | null {
	if (mission?.state === "error") {
		return {
			body: mission.errorMessage ?? "Task progress is unavailable.",
			id: `summary:${mission.taskId}:processing:error`,
			kind: "summary",
			title: "Processing",
		};
	}
	if (mission?.state === "loading") {
		return {
			body: `${mission.statusLabel}: Loading task updates.`,
			id: `summary:${mission.taskId}:processing:loading`,
			kind: "summary",
			title: "Processing",
		};
	}
	if (mission?.state === "ready") {
		const detail = latestStepDetail(mission);
		return {
			body: detail ? `${mission.statusLabel}: ${detail}` : mission.statusLabel,
			id: `summary:${mission.taskId}:processing:${mission.status}`,
			kind: "summary",
			title: "Processing",
		};
	}
	return createWorkflowStateRow(workflowState);
}

function createWorkflowStateRow(
	workflowState: ChatSessionRecord["workflowState"],
): ChatTranscriptSummaryRow | null {
	const label = workflowState ? WORKFLOW_STATE_LABELS.get(workflowState) : null;
	if (!label) return null;
	return {
		body: `${label} through the request.`,
		id: `summary:workflow:${workflowState}`,
		kind: "summary",
		title: label,
	};
}

function createPhaseResultRows(
	mission: ChatMissionProgressViewModel | null | undefined,
): ChatTranscriptSummaryRow[] {
	if (mission?.state !== "ready") return [];
	return Array.from(PHASE_RESULT_TITLES.entries()).flatMap(
		([phaseId, title]) => {
			const body = phaseResultBody(mission, phaseId);
			return body
				? [
						{
							body,
							id: `summary:${mission.taskId}:${phaseId}`,
							kind: "summary" as const,
							title,
						},
					]
				: [];
		},
	);
}

function phaseResultBody(
	mission: ChatMissionProgressViewModel,
	phaseId: ChatMissionPhaseId,
): string | null {
	const latestLog = latestMeaningfulSnippet(mission.phaseLogLines[phaseId]);
	if (latestLog) return latestLog;
	const phaseStep = latestStepForPhase(mission, phaseId);
	if (!phaseStep) return null;
	return summarySnippet(
		stepDetailText(phaseStep.detail) ?? formatActionLabel(phaseStep.action),
	);
}

function latestMeaningfulSnippet(lines: { text: string }[]): string | null {
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		const line = lines[index];
		const snippet = line ? readableSummarySnippet(line.text) : null;
		if (snippet) return snippet;
	}
	return null;
}

function createFileChangeSnapshotRows(
	mission: ChatMissionProgressViewModel | null | undefined,
): ChatTranscriptSummaryRow[] {
	if (mission?.state !== "ready") return [];
	return mission.executions.flatMap((execution) =>
		execution.steps.flatMap((step) => {
			if (!isFileChangeSnapshotStep(step)) return [];
			const body = stepDetailText(step.detail);
			return body
				? [
						{
							body: summarySnippet(body),
							id: `summary:${mission.taskId}:file-changes:${step.id}`,
							kind: "summary" as const,
							title: "File changes",
						},
					]
				: [];
		}),
	);
}

function latestStepDetail(
	mission: ChatMissionProgressViewModel,
): string | null {
	const step = latestStep(mission);
	if (!step) return null;
	const action = formatActionLabel(step.action);
	const detail = stepDetailText(step.detail);
	const status = formatActionLabel(step.status);
	if (!detail) return `${action} ${status}`.trim();
	return summarySnippet(detail);
}

function latestStepForPhase(
	mission: ChatMissionProgressViewModel,
	phaseId: ChatMissionPhaseId,
): TaskActivityStepRecord | null {
	return (
		latestSteps(mission).find(
			(step) =>
				!isFileChangeSnapshotStep(step) &&
				matchesPhase(step.action, step.detail, phaseId),
		) ?? null
	);
}

function latestStep(
	mission: ChatMissionProgressViewModel,
): TaskActivityStepRecord | null {
	return (
		latestSteps(mission).find((step) => !isFileChangeSnapshotStep(step)) ?? null
	);
}

function latestSteps(
	mission: ChatMissionProgressViewModel,
): TaskActivityStepRecord[] {
	return mission.executions.flatMap((execution) => execution.steps).reverse();
}

function matchesPhase(
	action: string,
	detail: string | null,
	phaseId: ChatMissionPhaseId,
): boolean {
	const haystack = `${action} ${stepDetailText(detail) ?? ""}`.toLowerCase();
	if (phaseId === "plan") return haystack.includes("plan");
	if (phaseId === "implement") {
		return haystack.includes("implement") || haystack.includes("progress");
	}
	return haystack.includes("test") || haystack.includes("review");
}

function isFileChangeSnapshotStep(step: TaskActivityStepRecord): boolean {
	return step.action === "file-changes";
}

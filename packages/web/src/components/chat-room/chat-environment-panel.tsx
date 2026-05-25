"use client";

import {
	BookOpen,
	Database,
	GitBranch,
	GitCommitHorizontal,
	GitPullRequest,
	ListChecks,
	Monitor,
	SquareCode,
} from "lucide-react";
import type { ReactElement, ReactNode } from "react";

import type {
	SkillRecord,
	TaskActivityStepRecord,
	WorkspaceEnvironmentGitStatus,
	WorkspaceEnvironmentResponse,
} from "@/lib/api";
import {
	useSkillsQuery,
	useWorkspaceEnvironmentQuery,
} from "@/lib/api/queries";
import { cn } from "@/lib/utils";

import type { ChatMissionProgressViewModel } from "./types/chat-mission-progress.types";

const MAX_SKILLS = 3;
const MAX_CHECKPOINTS = 4;

export function ChatEnvironmentPanel({
	missionProgress,
	projectId,
	onDraftCommand,
}: {
	missionProgress: ChatMissionProgressViewModel | null;
	projectId: string | null;
	onDraftCommand: (draft: string) => void;
}): ReactElement {
	const environmentQuery = useWorkspaceEnvironmentQuery(projectId, {
		refetchIntervalMs: 5000,
	});
	const skillsQuery = useSkillsQuery({ refetchIntervalMs: 30000 });
	const environment = environmentQuery.data;
	const checkpoints = latestCheckpoints(missionProgress);

	return (
		<aside className="absolute right-6 top-6 hidden w-64 rounded-lg border border-zinc-700/80 bg-zinc-800/95 px-4 py-4 text-zinc-100 backdrop-blur xl:grid">
			<header className="mb-4 flex items-center justify-between">
				<h2 className="m-0 text-base font-medium text-zinc-400">Environment</h2>
				<SquareCode aria-hidden="true" className="text-zinc-400" size={18} />
			</header>
			<div className="grid gap-3">
				<EnvironmentRow icon={<SquareCode size={16} />} label="Changes">
					<ChangeSummary environment={environment} />
				</EnvironmentRow>
				<EnvironmentRow icon={<Monitor size={16} />} label="Local">
					<span className="max-w-36 truncate text-sm text-zinc-400">
						{environment?.folder ?? "Loading..."}
					</span>
				</EnvironmentRow>
				<EnvironmentRow icon={<GitBranch size={16} />} label="Branch">
					<span className="max-w-36 truncate text-sm text-zinc-300">
						{branchLabel(environment?.git)}
					</span>
				</EnvironmentRow>
				<ActionRow
					icon={<GitCommitHorizontal size={16} />}
					label="Commit"
					onClick={() => onDraftCommand("Commit the current changes.")}
				/>
				<ActionRow
					icon={<GitPullRequest size={16} />}
					label="Create pull request"
					onClick={() =>
						onDraftCommand("Create a pull request for the current branch.")
					}
				/>
			</div>
			<div className="my-4 h-px bg-zinc-700/70" />
			<div className="grid gap-3">
				<p className="m-0 text-base font-medium text-zinc-400">Sources</p>
				{environment?.mcps.map((source) => (
					<EnvironmentRow
						icon={<Database size={16} />}
						key={source.id}
						label={source.label}
					>
						<StatusDot active={source.available} />
					</EnvironmentRow>
				)) ?? (
					<EnvironmentRow icon={<Database size={16} />} label="CodeGraph">
						<span className="text-sm text-zinc-500">Loading</span>
					</EnvironmentRow>
				)}
				<SkillsRows skills={skillsQuery.data} />
				<CheckpointRows checkpoints={checkpoints} />
			</div>
		</aside>
	);
}

function EnvironmentRow({
	children,
	icon,
	label,
}: {
	children?: ReactNode;
	icon: ReactNode;
	label: string;
}): ReactElement {
	return (
		<div className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3">
			<span className="text-zinc-400">{icon}</span>
			<span className="min-w-0 truncate text-sm font-medium text-zinc-100">
				{label}
			</span>
			{children}
		</div>
	);
}

function ActionRow({
	icon,
	label,
	onClick,
}: {
	icon: ReactNode;
	label: string;
	onClick: () => void;
}): ReactElement {
	return (
		<button
			className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 rounded-md py-1 text-left text-zinc-100 transition hover:bg-zinc-700/70 focus:outline-none focus:ring-2 focus:ring-zinc-500"
			onClick={onClick}
			type="button"
		>
			<span className="text-zinc-400">{icon}</span>
			<span className="min-w-0 truncate text-sm font-medium">{label}</span>
		</button>
	);
}

function ChangeSummary({
	environment,
}: {
	environment: WorkspaceEnvironmentResponse | undefined;
}): ReactElement {
	const git = environment?.git;
	if (!git?.available) {
		return <span className="text-sm text-zinc-500">Unavailable</span>;
	}
	return (
		<span className="flex items-center gap-1 text-sm tabular-nums">
			<span className="text-emerald-400">+{git.added}</span>
			<span className="text-red-400">-{git.deleted}</span>
			{git.untracked > 0 ? (
				<span className="text-zinc-400">?{git.untracked}</span>
			) : null}
		</span>
	);
}

function SkillsRows({
	skills,
}: {
	skills: SkillRecord[] | undefined;
}): ReactElement {
	const visibleSkills = skills?.slice(0, MAX_SKILLS) ?? [];
	const skillNames =
		visibleSkills.map((skill) => skill.name).join(", ") || "None";
	const overflow =
		skills && skills.length > MAX_SKILLS
			? ` +${skills.length - MAX_SKILLS}`
			: "";
	const label = skills ? `${skillNames}${overflow}` : "Loading";
	return (
		<EnvironmentRow icon={<BookOpen size={16} />} label="Skills">
			<span className="max-w-40 truncate text-sm text-zinc-400">{label}</span>
		</EnvironmentRow>
	);
}

function CheckpointRows({
	checkpoints,
}: {
	checkpoints: TaskActivityStepRecord[];
}): ReactElement {
	const label =
		checkpoints.length > 0
			? `${completedCount(checkpoints)}/${checkpoints.length}`
			: "None";
	return (
		<EnvironmentRow icon={<ListChecks size={16} />} label="Checkpoints">
			<span className="text-sm text-zinc-400">{label}</span>
		</EnvironmentRow>
	);
}

function StatusDot({ active }: { active: boolean }): ReactElement {
	return (
		<span
			className={cn(
				"h-2.5 w-2.5 rounded-full",
				active ? "bg-emerald-400" : "bg-zinc-500",
			)}
		/>
	);
}

function branchLabel(git: WorkspaceEnvironmentGitStatus | undefined): string {
	if (!git) return "Loading...";
	if (!git.available) return git.reason ?? "Unavailable";
	return git.branch ?? "HEAD";
}

function latestCheckpoints(
	mission: ChatMissionProgressViewModel | null,
): TaskActivityStepRecord[] {
	const executions = mission?.executions ?? [];
	for (let index = executions.length - 1; index >= 0; index -= 1) {
		const execution = executions[index];
		if (execution?.steps.length) {
			return execution.steps.slice(0, MAX_CHECKPOINTS);
		}
	}
	return [];
}

function completedCount(checkpoints: TaskActivityStepRecord[]): number {
	return checkpoints.filter((checkpoint) =>
		["succeeded", "success", "completed", "done"].includes(
			checkpoint.status.toLowerCase(),
		),
	).length;
}

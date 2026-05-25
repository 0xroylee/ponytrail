import type {
	PriorityOption,
	StatusPresentation,
} from "./types/issues-board.types";

export const DEFAULT_WORKSPACE_ID = "owner-1";
export const DEFAULT_CREATOR_ID = "member-1";

export const STATUS_ORDER = [
	"backlog",
	"plan",
	"implementing",
	"reviewing",
	"testing",
	"done",
] as const;

export const STATUS_PRESENTATION: Record<string, StatusPresentation> = {
	backlog: { label: "Backlog", tone: "border-slate-700/70 bg-surface-panel" },
	plan: { label: "Plan", tone: "border-slate-700/70 bg-surface-panel" },
	implementing: {
		label: "In Progress",
		tone: "border-yellow-900/50 bg-yellow-950/35",
	},
	reviewing: {
		label: "In Review",
		tone: "border-emerald-900/50 bg-emerald-950/35",
	},
	testing: { label: "Testing", tone: "border-cyan-900/50 bg-cyan-950/35" },
	done: { label: "Done", tone: "border-indigo-900/50 bg-indigo-950/35" },
};

export const PRIORITY_OPTIONS: readonly PriorityOption[] = [
	{ value: 1, label: "Urgent" },
	{ value: 2, label: "High" },
	{ value: 3, label: "Medium" },
	{ value: 4, label: "Low" },
	{ value: 0, label: "No priority" },
];

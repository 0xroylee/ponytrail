"use client";

import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import type {
	AgentHealthViewModel,
	AgentRuntimeTabViewModel,
	AgentRuntimeTabsViewModel,
} from "@/lib/agents/types/agent-monitor.types";

import { AgentMonitorSkeleton } from "./agent-monitor-skeleton";

interface AgentMonitorPanelProps {
	health: AgentHealthViewModel;
	runtimes: AgentRuntimeTabsViewModel;
	activeRuntimeTabId: string | null;
	showDetails: boolean;
	onRuntimeTabChange: (tabId: string) => void;
	onToggleDetails: () => void;
}

export function AgentMonitorPanel({
	health,
	runtimes,
	activeRuntimeTabId,
	showDetails,
	onRuntimeTabChange,
	onToggleDetails,
}: AgentMonitorPanelProps): ReactElement {
	if (health.status === "loading") {
		return <AgentMonitorSkeleton />;
	}

	const activeRuntimeTab =
		runtimes.tabs.find((tab) => tab.id === activeRuntimeTabId) ??
		runtimes.tabs[0] ??
		null;
	const resolvedActiveRuntimeTabId = activeRuntimeTab?.id ?? null;

	return (
		<section style={{ maxWidth: "44rem", width: "100%" }}>
			<Typography className="mb-3" variant="pageTitle">
				ADHD.ai Agent Monitor
			</Typography>
			<Typography className="mb-4 text-zinc-400">{health.summary}</Typography>
			<div style={tabListStyle}>
				{renderRuntimeTabs(
					runtimes,
					resolvedActiveRuntimeTabId,
					onRuntimeTabChange,
				)}
			</div>
			<div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
				<Button type="button" onClick={onToggleDetails}>
					{showDetails ? "Hide details" : "Show details"}
				</Button>
			</div>
			<div style={{ color: "#e4e4e7" }}>
				<Typography className="mb-2">Server status: {health.status}</Typography>
				<Typography className="mb-2">
					Runtime tabs: {runtimes.summary}
				</Typography>
				{showDetails ? (
					<RuntimeDetails activeRuntimeTab={activeRuntimeTab} />
				) : null}
			</div>
		</section>
	);
}

function renderRuntimeTabs(
	runtimes: AgentRuntimeTabsViewModel,
	activeRuntimeTabId: string | null,
	onRuntimeTabChange: (tabId: string) => void,
): ReactElement {
	if (runtimes.status !== "ready") {
		return (
			<Button
				className="grid h-auto min-w-[8.5rem] justify-start gap-1 text-left text-zinc-400"
				type="button"
				disabled
				variant="outline"
			>
				<Typography className="break-words text-[0.95rem] font-bold leading-[1.2]">
					{runtimes.summary}
				</Typography>
			</Button>
		);
	}

	return (
		<>
			{runtimes.tabs.map((tab) => {
				const isActive = activeRuntimeTabId === tab.id;
				return (
					<Button
						key={tab.id}
						type="button"
						onClick={() => onRuntimeTabChange(tab.id)}
						aria-pressed={isActive}
						className={`grid h-auto min-w-[8.5rem] justify-start gap-1 text-left ${
							isActive ? "border-blue-400 bg-surface-active" : ""
						}`}
						variant="outline"
					>
						<Typography className="break-words text-[0.78rem] leading-[1.2] text-zinc-400">
							{tab.name}
						</Typography>
						<Typography className="break-words text-[0.95rem] font-bold leading-[1.2]">
							{tab.runtimeLabel}
						</Typography>
					</Button>
				);
			})}
		</>
	);
}

function RuntimeDetails({
	activeRuntimeTab,
}: {
	activeRuntimeTab: AgentRuntimeTabViewModel | null;
}): ReactElement {
	if (!activeRuntimeTab) {
		return <Typography>Active runtime: none</Typography>;
	}

	return (
		<Typography>
			Active runtime:{" "}
			<Typography as="strong" variant="cardTitle">
				{activeRuntimeTab.runtimeLabel}
			</Typography>
			{" · "}
			Model:{" "}
			<Typography as="strong" variant="cardTitle">
				{activeRuntimeTab.model}
			</Typography>
		</Typography>
	);
}

const tabListStyle = {
	display: "flex",
	flexWrap: "wrap",
	gap: "0.5rem",
	marginBottom: "1rem",
} as const;

"use client";

import { Activity, CircleAlert, CircleCheck, RefreshCw } from "lucide-react";
import type { ReactElement } from "react";

import { Typography } from "@/components/ui/typography";
import type { PollingEventRecord, PollingStatusRecord } from "@/lib/api";
import { usePollingStatusQuery } from "@/lib/api/queries";

export function PollingMonitorPanel(): ReactElement {
	const query = usePollingStatusQuery({ refetchIntervalMs: 5000 });
	if (query.isLoading) {
		return <PollingState label="Loading polling status" />;
	}
	if (query.error) {
		return <PollingState label={query.error.message} />;
	}
	const pollers = query.data?.pollers ?? [];
	const events = query.data?.events ?? [];
	return (
		<section className="grid h-full min-h-0 gap-4 overflow-auto p-4 text-zinc-100">
			<header className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<Typography className="text-2xl" variant="pageTitle">
						Autopilot
					</Typography>
					<Typography className="mt-1 text-zinc-400" variant="description">
						Polling health and operational events
					</Typography>
				</div>
				<div className="flex items-center gap-2 text-sm text-zinc-400">
					<RefreshCw size={16} />
					<Typography variant="metadata">
						{formatRefreshedAt(query.dataUpdatedAt)}
					</Typography>
				</div>
			</header>
			{pollers.length ? (
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{pollers.map((poller) => (
						<PollerTile key={poller.id} poller={poller} />
					))}
				</div>
			) : (
				<PollingState label="No poller status recorded" />
			)}
			<EventLog events={events} />
		</section>
	);
}

function PollerTile({ poller }: { poller: PollingStatusRecord }): ReactElement {
	const working = isPollerWorking(poller);
	const Icon = working ? CircleCheck : CircleAlert;
	return (
		<article className="grid gap-3 rounded-lg border border-border bg-card p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<Typography className="truncate" variant="sectionTitle">
						{formatPollerName(poller)}
					</Typography>
					<Typography variant="muted">{poller.id}</Typography>
				</div>
				<Icon
					className={working ? "text-emerald-400" : "text-amber-400"}
					size={20}
				/>
			</div>
			<div className="grid grid-cols-2 gap-2 text-sm">
				<Metric label="State" value={poller.state} />
				<Metric label="Last success" value={formatTime(poller.lastSuccessAt)} />
				<Metric label="Issues" value={String(poller.lastIssueCount)} />
				<Metric label="Ready tasks" value={String(poller.lastReadyTaskCount)} />
				<Metric label="Dispatches" value={String(poller.lastDispatchCount)} />
				<Metric label="Failures" value={String(poller.consecutiveFailures)} />
			</div>
			{poller.lastError ? (
				<Typography
					className="rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2"
					variant="error"
				>
					{poller.lastError}
				</Typography>
			) : null}
		</article>
	);
}

function Metric({
	label,
	value,
}: { label: string; value: string }): ReactElement {
	return (
		<div className="rounded-md border border-border bg-surface-inset px-3 py-2">
			<Typography variant="muted">{label}</Typography>
			<Typography className="truncate text-zinc-200">{value}</Typography>
		</div>
	);
}

function EventLog({ events }: { events: PollingEventRecord[] }): ReactElement {
	return (
		<section className="min-h-0 rounded-lg border border-border bg-card">
			<header className="flex items-center gap-2 border-b border-border px-4 py-3">
				<Activity size={18} />
				<Typography variant="sectionTitle">Recent Polling Events</Typography>
			</header>
			{events.length ? (
				<div className="overflow-auto">
					<table className="w-full min-w-[48rem] border-collapse text-left text-sm">
						<thead className="text-xs uppercase text-muted-foreground">
							<tr>
								<Typography as="th" className="px-4 py-3" variant="tableHeader">
									Time
								</Typography>
								<Typography as="th" className="px-4 py-3" variant="tableHeader">
									Poller
								</Typography>
								<Typography as="th" className="px-4 py-3" variant="tableHeader">
									Level
								</Typography>
								<Typography as="th" className="px-4 py-3" variant="tableHeader">
									Type
								</Typography>
								<Typography as="th" className="px-4 py-3" variant="tableHeader">
									Message
								</Typography>
							</tr>
						</thead>
						<tbody>
							{events.map((event) => (
								<tr className="border-t border-border" key={event.id}>
									<Typography
										as="td"
										className="px-4 py-3"
										variant="description"
									>
										{formatTime(event.createdAt)}
									</Typography>
									<Typography as="td" className="px-4 py-3" variant="tableCell">
										{event.pollerId}
									</Typography>
									<Typography as="td" className="px-4 py-3" variant="tableCell">
										{event.level}
									</Typography>
									<Typography
										as="td"
										className="px-4 py-3 text-zinc-400"
										variant="tableCell"
									>
										{event.eventType}
									</Typography>
									<Typography as="td" className="px-4 py-3" variant="tableCell">
										{event.message}
									</Typography>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<PollingState label="No polling events recorded" />
			)}
		</section>
	);
}

function PollingState({ label }: { label: string }): ReactElement {
	return (
		<div className="grid min-h-32 place-items-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
			<Typography variant="description">{label}</Typography>
		</div>
	);
}

function isPollerWorking(poller: PollingStatusRecord): boolean {
	if (poller.state === "running") {
		return true;
	}
	if (!poller.lastSuccessAt) {
		return false;
	}
	const lastSuccess = new Date(poller.lastSuccessAt).getTime();
	if (Number.isNaN(lastSuccess)) {
		return false;
	}
	const freshnessMs = Math.max(poller.intervalMs * 3, 5 * 60 * 1000);
	return Date.now() - lastSuccess <= freshnessMs;
}

function formatPollerName(poller: PollingStatusRecord): string {
	return poller.projectId
		? `${poller.sourceType} / ${poller.projectId}`
		: poller.sourceType;
}

function formatRefreshedAt(value: number): string {
	return value
		? `Updated ${formatTime(new Date(value).toISOString())}`
		: "Updated";
}

function formatTime(value: string | null): string {
	if (!value) {
		return "never";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
		Math.round((date.getTime() - Date.now()) / 60000),
		"minute",
	);
}

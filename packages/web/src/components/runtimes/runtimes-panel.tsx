"use client";

import { Bot, Cpu, Server } from "lucide-react";
import { type ReactElement, useMemo } from "react";

import { Typography } from "@/components/ui/typography";
import { useAgentsQuery } from "@/lib/api/queries";

import { deriveRuntimeSummaries } from "./runtimes-panel-utils";
import type { RuntimeSummary } from "./types/runtimes-panel.types";

export function RuntimesPanel(): ReactElement {
	const agentsQuery = useAgentsQuery();
	const runtimes = useMemo(
		() => deriveRuntimeSummaries(agentsQuery.data ?? []),
		[agentsQuery.data],
	);

	if (agentsQuery.isPending) {
		return <RuntimeStatePanel message="Loading runtimes..." title="Runtimes" />;
	}

	if (agentsQuery.isError) {
		return (
			<RuntimeStatePanel
				message={agentsQuery.error.message || "Failed to load runtimes."}
				title="Runtimes"
				tone="error"
			/>
		);
	}

	if (runtimes.length === 0) {
		return (
			<RuntimeStatePanel
				message="No runtimes are configured."
				title="Runtimes"
			/>
		);
	}

	return (
		<section className="grid gap-4" aria-labelledby="runtimes-title">
			<header className="flex flex-wrap items-end justify-between gap-3">
				<div className="grid gap-1">
					<Typography as="h2" id="runtimes-title" variant="sectionTitle">
						Configured runtimes
					</Typography>
					<Typography variant="description">
						{runtimes.length} runtime{runtimes.length === 1 ? "" : "s"} across{" "}
						{agentsQuery.data?.length ?? 0} agent
						{agentsQuery.data?.length === 1 ? "" : "s"}
					</Typography>
				</div>
				<Typography className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2">
					<Server size={15} />
					Capacity {totalCapacity(runtimes)}
				</Typography>
			</header>
			<ul className="m-0 grid list-none gap-3 p-0">
				{runtimes.map((runtime) => (
					<RuntimeCard key={runtime.id} runtime={runtime} />
				))}
			</ul>
		</section>
	);
}

function RuntimeCard({
	runtime,
}: {
	runtime: RuntimeSummary;
}): ReactElement {
	return (
		<li className="grid gap-3 rounded-lg border border-border bg-card p-4">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 items-start gap-3">
					<span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-zinc-700 bg-surface-hover text-zinc-200">
						<Cpu size={17} />
					</span>
					<div className="min-w-0">
						<Typography className="break-words" variant="cardTitle">
							{runtime.label}
						</Typography>
						<Typography className="break-words" variant="muted">
							{runtime.id}
						</Typography>
					</div>
				</div>
				<div className="flex flex-wrap gap-2 text-xs text-zinc-300">
					<RuntimeMetric label="Agents" value={runtime.agentCount} />
					<RuntimeMetric label="Capacity" value={runtime.totalConcurrency} />
				</div>
			</header>
			<div className="grid gap-3 md:grid-cols-3">
				<RuntimeChips label="Backends" values={runtime.backendLabels} />
				<RuntimeChips label="Models" values={runtime.models} />
				<RuntimeChips label="Owners" values={runtime.owners} />
			</div>
			<RuntimeAgents runtime={runtime} />
		</li>
	);
}

function RuntimeMetric({
	label,
	value,
}: {
	label: string;
	value: number;
}): ReactElement {
	return (
		<span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
			<Typography variant="muted">{label}</Typography>
			<Typography as="strong" variant="cardTitle">
				{value}
			</Typography>
		</span>
	);
}

function RuntimeChips({
	label,
	values,
}: {
	label: string;
	values: string[];
}): ReactElement {
	return (
		<div className="grid content-start gap-2">
			<Typography variant="eyebrow">{label}</Typography>
			<div className="flex flex-wrap gap-2">
				{values.map((value) => (
					<Typography
						className="rounded-md border border-border px-2 py-1"
						key={value}
						variant="metadata"
					>
						{value}
					</Typography>
				))}
			</div>
		</div>
	);
}

function RuntimeAgents({
	runtime,
}: {
	runtime: RuntimeSummary;
}): ReactElement {
	return (
		<div className="grid gap-2">
			<Typography variant="eyebrow">Agents</Typography>
			<ul className="m-0 grid list-none gap-2 p-0">
				{runtime.agents.map((agent) => (
					<li
						className="grid gap-1 rounded-md border border-border bg-surface-input p-3 sm:grid-cols-[1fr_auto]"
						key={agent.id}
					>
						<div className="min-w-0">
							<Typography className="flex min-w-0 items-center gap-2 text-zinc-100">
								<Bot className="shrink-0" size={15} />
								<Typography as="span" className="break-words">
									{agent.name}
								</Typography>
							</Typography>
							<Typography className="break-words" variant="muted">
								{agent.id}
							</Typography>
						</div>
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 sm:justify-end">
							<Typography variant="metadata">{agent.model}</Typography>
							<Typography variant="metadata">Owner {agent.owner}</Typography>
							<Typography variant="metadata">
								Concurrency {agent.concurrency}
							</Typography>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}

function RuntimeStatePanel({
	title,
	message,
	tone = "default",
}: {
	title: string;
	message: string;
	tone?: "default" | "error";
}): ReactElement {
	const className =
		tone === "error"
			? "grid gap-3 rounded-lg border border-red-900/50 bg-red-950/20 p-4"
			: "grid gap-3 rounded-lg border border-border bg-card p-4";

	return (
		<section className={className}>
			<Typography className="text-zinc-200" variant="sectionTitle">
				{title}
			</Typography>
			<Typography variant={tone === "error" ? "error" : "description"}>
				{message}
			</Typography>
		</section>
	);
}

function totalCapacity(runtimes: RuntimeSummary[]): number {
	return runtimes.reduce(
		(total, runtime) => total + runtime.totalConcurrency,
		0,
	);
}

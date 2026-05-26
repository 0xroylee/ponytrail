"use client";

import { Bot } from "lucide-react";
import { type ReactElement, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import type { AgentRecord } from "@/lib/api";
import { useAgentsQuery } from "@/lib/api/queries";

import { AgentDetailDialog } from "./agent-detail-dialog";

export function AgentsPanel(): ReactElement {
	const agentsQuery = useAgentsQuery();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const selectedAgent = useMemo(
		() => agentsQuery.data?.find((agent) => agent.id === selectedId) ?? null,
		[agentsQuery.data, selectedId],
	);

	if (agentsQuery.isPending) {
		return (
			<section className="grid gap-3 rounded-lg border border-border bg-card p-4">
				<Typography className="text-zinc-200" variant="sectionTitle">
					Agents
				</Typography>
				<Typography variant="description">
					Loading available agents...
				</Typography>
			</section>
		);
	}

	if (agentsQuery.isError) {
		return (
			<section className="grid gap-3 rounded-lg border border-red-900/50 bg-red-950/20 p-4">
				<Typography className="text-red-200" variant="sectionTitle">
					Agents
				</Typography>
				<Typography className="text-red-100" variant="error">
					{agentsQuery.error.message || "Failed to load agents."}
				</Typography>
			</section>
		);
	}

	if (!agentsQuery.data || agentsQuery.data.length === 0) {
		return (
			<section className="grid gap-3 rounded-lg border border-border bg-card p-4">
				<Typography className="text-zinc-200" variant="sectionTitle">
					Agents
				</Typography>
				<Typography variant="description">No agents are available.</Typography>
			</section>
		);
	}

	return (
		<section className="grid gap-3 rounded-lg border border-border bg-card p-4">
			<header className="grid gap-1">
				<Typography className="text-zinc-200" variant="sectionTitle">
					Agents
				</Typography>
				<Typography variant="description">
					Select an agent to view and update runtime details.
				</Typography>
			</header>
			<ul className="m-0 grid list-none gap-2 p-0">
				{agentsQuery.data.map((agent) => (
					<AgentRow
						key={agent.id}
						agent={agent}
						onOpen={() => setSelectedId(agent.id)}
					/>
				))}
			</ul>
			{selectedAgent ? (
				<AgentDetailDialog
					agent={selectedAgent}
					onClose={() => setSelectedId(null)}
				/>
			) : null}
		</section>
	);
}

function AgentRow({
	agent,
	onOpen,
}: {
	agent: AgentRecord;
	onOpen: () => void;
}): ReactElement {
	return (
		<li>
			<Button
				className="grid h-auto w-full justify-stretch gap-2 rounded-md border-border bg-surface-input p-3 text-left hover:border-zinc-700 hover:bg-surface-hover"
				onClick={onOpen}
				type="button"
				variant="outline"
			>
				<div className="flex items-center justify-between gap-2">
					<Typography
						as="span"
						className="inline-flex items-center gap-2"
						variant="cardTitle"
					>
						<Bot size={15} />
						{agent.name}
					</Typography>
					<Typography variant="muted">{agent.id}</Typography>
				</div>
				<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
					<Typography variant="metadata">{agent.runtime}</Typography>
					<Typography variant="metadata">{agent.model}</Typography>
					<Typography variant="metadata">
						Concurrency {agent.concurrency}
					</Typography>
					<Typography variant="metadata">Owner {agent.owner}</Typography>
				</div>
				{agent.description ? (
					<Typography variant="muted">{agent.description}</Typography>
				) : null}
			</Button>
		</li>
	);
}

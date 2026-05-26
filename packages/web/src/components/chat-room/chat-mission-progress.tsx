"use client";

import { Radio } from "lucide-react";
import type { ReactElement } from "react";

import { Typography } from "@/components/ui/typography";
import { MissionBody } from "./chat-mission-progress-sections";
import type { ChatMissionProgressViewModel } from "./types/chat-mission-progress.types";

export function ChatMissionProgress({
	mission,
}: {
	mission: ChatMissionProgressViewModel | null;
}): ReactElement | null {
	if (!mission) return null;
	const isLoading = mission.state === "loading";
	const isError = mission.state === "error";
	const title = mission.title.trim();
	return (
		<section
			className="grid gap-4 justify-self-stretch rounded-md border border-border bg-surface-input px-3 py-3 text-sm text-zinc-300"
			data-chat-mission-progress="true"
		>
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
						<Radio size={14} />
						<Typography as="span" variant="eyebrow">
							Mission
						</Typography>
					</div>
					{title ? (
						<Typography className="mt-1 truncate" variant="sectionTitle">
							{title}
						</Typography>
					) : null}
				</div>
			</header>
			{isLoading ? <MissionState label="Loading mission progress..." /> : null}
			{isError ? (
				<MissionState
					label={mission.errorMessage ?? "Mission progress unavailable."}
				/>
			) : null}
			{mission.state === "ready" ? <MissionBody mission={mission} /> : null}
		</section>
	);
}

function MissionState({ label }: { label: string }): ReactElement {
	return <Typography variant="description">{label}</Typography>;
}

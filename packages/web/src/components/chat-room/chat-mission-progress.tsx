import type { ReactElement } from "react";

import { MissionBody } from "./chat-mission-progress-sections";
import type {
	ChatMissionLogLine,
	ChatMissionProgressViewModel,
} from "./types/chat-mission-progress.types";

export function ChatMissionProgress({
	liveLogLines = [],
	mission,
}: {
	liveLogLines?: ChatMissionLogLine[];
	mission: ChatMissionProgressViewModel | null;
}): ReactElement | null {
	if (!mission) return null;
	const isLoading = mission.state === "loading";
	const isError = mission.state === "error";
	return (
		<section
			className="sticky top-0 z-20 grid gap-3 justify-self-stretch rounded-md border border-border bg-surface-input/95 px-3 py-3 text-sm text-zinc-300 backdrop-blur"
			data-chat-mission-progress="true"
			data-chat-mission-progress-sticky="true"
		>
			{isLoading ? <MissionState label="Loading mission progress..." /> : null}
			{isError ? (
				<MissionState
					label={mission.errorMessage ?? "Mission progress unavailable."}
				/>
			) : null}
			{mission.state === "ready" ? (
				<MissionBody liveLogLines={liveLogLines} mission={mission} />
			) : null}
		</section>
	);
}

function MissionState({ label }: { label: string }): ReactElement {
	return <p className="m-0 text-sm text-muted-foreground">{label}</p>;
}

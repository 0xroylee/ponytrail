"use client";
import { Typography } from "@/components/ui/typography";
import { type ReactElement, useEffect, useRef } from "react";
import { ChatMessageBubble, ErrorLine } from "./chat-message-bubbles";
import { createChatTranscriptRows } from "./chat-transcript-message-state";
import type { ChatTranscriptProps } from "./types/chat-room.types";
import type { ChatTranscriptSummaryRow } from "./types/chat-transcript-message.types";
export function ChatTranscript({
	contentWidthClassName,
	error,
	isLoading,
	missionProgress,
	messages,
	session,
}: ChatTranscriptProps): ReactElement {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const previousSessionIdRef = useRef<string | null>(null);
	const sessionId = session?.id ?? null;
	const transcriptRows = createChatTranscriptRows({
		messages,
		missionProgress,
		session,
	});
	const renderedContentKey = transcriptRows
		.map((row) =>
			row.kind === "message"
				? `${row.message.id}:${row.message.createdAt}`
				: `${row.id}:${row.body}`,
		)
		.join(",");
	useEffect(() => {
		if (!sessionId) {
			previousSessionIdRef.current = null;
			return;
		}
		if (previousSessionIdRef.current === sessionId || isLoading) return;
		if (!renderedContentKey) return;
		const frame = window.requestAnimationFrame(() => {
			const container = scrollContainerRef.current;
			if (!container) return;
			container.scrollTop = container.scrollHeight;
			previousSessionIdRef.current = sessionId;
		});
		return () => window.cancelAnimationFrame(frame);
	}, [sessionId, isLoading, renderedContentKey]);

	return (
		<div
			className="relative min-h-0 min-w-0 overflow-auto px-4 py-6"
			ref={scrollContainerRef}
		>
			<div
				className={`mx-auto flex w-full min-w-0 ${contentWidthClassName} flex-col gap-4`}
			>
				<div
					className={`mx-auto grid w-full min-w-0 ${contentWidthClassName} gap-4`}
					data-chat-transcript-message-column="true"
				>
					{error ? <ErrorLine text={error.message} /> : null}
					{transcriptRows.map((row) =>
						row.kind === "message" ? (
							<ChatMessageBubble key={row.message.id} message={row.message} />
						) : (
							<ChatTranscriptSummaryBubble key={row.id} row={row} />
						),
					)}
				</div>
			</div>
		</div>
	);
}

function ChatTranscriptSummaryBubble({
	row,
}: {
	row: ChatTranscriptSummaryRow;
}): ReactElement {
	return (
		<article
			className="grid max-w-[min(42rem,90%)] justify-self-start gap-1 rounded-md border border-zinc-700 bg-surface-panel px-3 py-2 text-sm text-zinc-200"
			data-chat-message-display="summary"
		>
			<Typography className="text-zinc-400" variant="eyebrow">
				{row.title}
			</Typography>
			<Typography className="whitespace-pre-wrap break-words leading-6">
				{row.body}
			</Typography>
		</article>
	);
}

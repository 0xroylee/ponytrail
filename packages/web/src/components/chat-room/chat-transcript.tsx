"use client";
import { Typography } from "@/components/ui/typography";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { ChatMessageBubble, ErrorLine } from "./chat-message-bubbles";
import { createChatTranscriptRows } from "./chat-transcript-message-state";
import { shouldScrollChatTranscriptToBottom } from "./chat-transcript-scroll-state";
import { shouldShowChatTranscriptWorkingHeader } from "./chat-transcript-working-state";
import { formatWaitDurationLabel } from "./chat-wait-label";
import type { ChatTranscriptProps } from "./types/chat-room.types";
import type { ChatTranscriptSummaryRow } from "./types/chat-transcript-message.types";
export function ChatTranscript({
	contentWidthClassName,
	error,
	isLoading,
	isPlanning,
	isThinking,
	missionProgress,
	messages,
	session,
	streamLines,
	workingStartedAt,
}: ChatTranscriptProps): ReactElement {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const previousSessionIdRef = useRef<string | null>(null);
	const previousMessageKeyRef = useRef("");
	const sessionId = session?.id ?? null;
	const transcriptRows = createChatTranscriptRows({
		messages,
		missionProgress,
		session,
	});
	const messageContentKey = messages
		.map((message) => `${message.id}:${message.createdAt}`)
		.join(",");
	const showWorkingHeader = shouldShowChatTranscriptWorkingHeader({
		hasWorkingStart: Boolean(workingStartedAt),
		isPlanning,
		isThinking,
		streamLineCount: streamLines.length,
	});
	useEffect(() => {
		if (!sessionId) {
			previousSessionIdRef.current = null;
			previousMessageKeyRef.current = "";
			return;
		}
		if (
			!shouldScrollChatTranscriptToBottom({
				currentMessageKey: messageContentKey,
				currentSessionId: sessionId,
				isLoading,
				previousMessageKey: previousMessageKeyRef.current,
				previousSessionId: previousSessionIdRef.current,
			})
		) {
			return;
		}
		const frame = window.requestAnimationFrame(() => {
			const container = scrollContainerRef.current;
			if (!container) return;
			container.scrollTop = container.scrollHeight;
			previousSessionIdRef.current = sessionId;
			previousMessageKeyRef.current = messageContentKey;
		});
		return () => window.cancelAnimationFrame(frame);
	}, [sessionId, isLoading, messageContentKey]);

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
					{showWorkingHeader ? (
						<WorkingSectionHeader startedAt={workingStartedAt ?? ""} />
					) : null}
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

function WorkingSectionHeader({
	startedAt,
}: {
	startedAt: string;
}): ReactElement {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	return (
		<div className="grid gap-4 pt-2">
			<Typography variant="description">
				{formatWaitDurationLabel(startedAt, now)}
			</Typography>
			<div className="h-px bg-surface-active" />
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

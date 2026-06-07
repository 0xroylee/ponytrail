"use client";

import { useUiStore } from "@/lib/ui-store";
import type { ReactElement } from "react";
import { ChatClarificationComposer } from "./chat-clarification-composer";
import { ChatComposer } from "./chat-composer";
import { ChatComposerSkeleton } from "./chat-composer-skeleton";
import { ChatRoomHeader } from "./chat-room-header";
import {
	shouldShowChatRoomLoadingShell,
	shouldShowMissionProgressSkeleton,
} from "./chat-room-loading-state";
import { CHAT_SESSION_SUBCHANNEL_LABELS } from "./chat-session-subchannels";
import { ChatTaskInfoChannel } from "./chat-task-info-channel";
import { ChatTranscript } from "./chat-transcript";
import { ChatNoSessionHome } from "./chat-welcome-states";
import type { ChatRoomPanelViewProps } from "./types/chat-room.types";

export function ChatRoomPanelView({
	activeSubchannel,
	activeTaskId,
	draft,
	isBusy,
	isMessagesLoading,
	isRerunDisabled,
	isRerunning,
	isRerunVisible,
	isSending,
	isPlanning,
	isThinking,
	missionProgress,
	messages,
	messagesError,
	pendingAnswers,
	pendingQuestionIndex,
	selectedSession,
	streamLines,
	workingStartedAt,
	onAnswerChange,
	onDraftChange,
	onOpenSidebar,
	onRerunWorkflow,
	onSelectCommand,
	onSelectOption,
	onSubmit,
	onSubmitAnswers,
}: ChatRoomPanelViewProps): ReactElement {
	const messageInputFocusRequest = useUiStore(
		(state) => state.messageInputFocusRequest,
	);
	const clearMessageInputFocusRequest = useUiStore(
		(state) => state.clearMessageInputFocusRequest,
	);
	const pendingQuestions = selectedSession?.pendingQuestions ?? [];
	const hasPendingQuestions = pendingQuestions.length > 0;
	const messageInputFocusRequestId =
		messageInputFocusRequest &&
		messageInputFocusRequest.sessionId === selectedSession?.id
			? messageInputFocusRequest.id
			: null;
	const isTaskInfoChannel = activeSubchannel === "task-info";
	const subchannelLabel = CHAT_SESSION_SUBCHANNEL_LABELS[activeSubchannel];
	const showLoadingShell = shouldShowChatRoomLoadingShell({
		hasSelectedSession: Boolean(selectedSession),
		isMessagesLoading,
		isRealtimeActive: Boolean(workingStartedAt) || isPlanning || isThinking,
	});
	// const showLoadingShell = true
	const showMissionSkeleton = shouldShowMissionProgressSkeleton({
		hasActiveTask: Boolean(activeTaskId),
		isChatRoomLoading: showLoadingShell,
	});
	const layoutClassName =
		"relative grid h-[100dvh] min-w-0 grid-rows-[minmax(0,1fr)] overflow-hidden bg-background text-zinc-100";

	return (
		<section className={layoutClassName}>
			{selectedSession ? (
				<div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto]">
					<ChatRoomHeader
						isRerunDisabled={isRerunDisabled}
						isRerunning={isRerunning}
						isRerunVisible={isRerunVisible}
						projectId={selectedSession.projectId ?? "default"}
						subchannelLabel={subchannelLabel}
						title={selectedSession.title}
						onOpenSidebar={onOpenSidebar}
						onRerunWorkflow={onRerunWorkflow}
					/>
					{isTaskInfoChannel ? (
						<ChatTaskInfoChannel
							missionProgress={missionProgress}
							taskId={activeTaskId}
						/>
					) : (
						<>
							<ChatTranscript
								error={messagesError}
								isLoading={showLoadingShell}
								isPlanning={isPlanning}
								isThinking={isThinking}
								missionProgress={missionProgress}
								messages={messages}
								showMissionSkeleton={showMissionSkeleton}
								session={selectedSession}
								streamLines={streamLines}
								workingStartedAt={workingStartedAt}
								onDraftCommand={onSelectCommand}
							/>
							{showLoadingShell ? (
								<ChatComposerSkeleton />
							) : hasPendingQuestions ? (
								<ChatClarificationComposer
									answers={pendingAnswers}
									disabled={isBusy || isSending}
									pendingQuestionIndex={pendingQuestionIndex}
									questions={pendingQuestions}
									onAnswerChange={onAnswerChange}
									onSelectOption={onSelectOption}
									onSubmit={onSubmitAnswers}
								/>
							) : (
								<ChatComposer
									disabled={isBusy}
									draft={draft}
									isSending={isSending}
									messageInputFocusRequestId={messageInputFocusRequestId}
									onDraftChange={onDraftChange}
									onMessageInputFocusRequestHandled={
										clearMessageInputFocusRequest
									}
									onSelectCommand={onSelectCommand}
									onSubmit={onSubmit}
								/>
							)}
						</>
					)}
				</div>
			) : (
				<ChatNoSessionHome
					disabled={isBusy}
					draft={draft}
					isSending={isSending}
					onDraftChange={onDraftChange}
					onOpenSidebar={onOpenSidebar}
					onSelectCommand={onSelectCommand}
					onSubmit={onSubmit}
				/>
			)}
		</section>
	);
}

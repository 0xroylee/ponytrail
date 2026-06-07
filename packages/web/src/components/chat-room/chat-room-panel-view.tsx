"use client";

import { useUiStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import type { ReactElement } from "react";
import { ChatClarificationComposer } from "./chat-clarification-composer";
import { ChatComposer } from "./chat-composer";
import { ChatComposerSkeleton } from "./chat-composer-skeleton";
import { ChatRoomHeader } from "./chat-room-header";
import {
	shouldShowChatRoomLoadingShell,
	shouldShowMissionProgressSkeleton,
} from "./chat-room-loading-state";
import { ChatTaskDetailPanel } from "./chat-task-detail-sheet";
import { ChatTranscript } from "./chat-transcript";
import { ChatNoSessionHome } from "./chat-welcome-states";
import type { ChatRoomPanelViewProps } from "./types/chat-room.types";

export function ChatRoomPanelView({
	activeTaskId,
	draft,
	isBusy,
	isMessagesLoading,
	isRerunDisabled,
	isRerunning,
	isRerunVisible,
	isSending,
	isPlanning,
	isTaskDetailPanelOpen,
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
	onCloseTaskDetails,
	onDraftChange,
	onOpenSidebar,
	onRerunWorkflow,
	onToggleTaskDetails,
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
	const hasOpenTaskDetails = isTaskDetailPanelOpen && Boolean(activeTaskId);
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
	const layoutClassName = cn(
		"relative grid h-[100dvh] min-w-0 grid-rows-[minmax(0,1fr)] overflow-hidden bg-background text-zinc-100",
		hasOpenTaskDetails && "md:grid-cols-[minmax(0,1fr)_26rem]",
	);

	return (
		<section className={layoutClassName}>
			{selectedSession ? (
				<div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto]">
					<ChatRoomHeader
						activeTaskId={activeTaskId}
						isRerunDisabled={isRerunDisabled}
						isRerunning={isRerunning}
						isRerunVisible={isRerunVisible}
						isTaskDetailPanelOpen={hasOpenTaskDetails}
						projectId={selectedSession.projectId ?? "default"}
						title={selectedSession.title}
						onOpenSidebar={onOpenSidebar}
						onRerunWorkflow={onRerunWorkflow}
						onToggleTaskDetails={onToggleTaskDetails}
					/>
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
							onMessageInputFocusRequestHandled={clearMessageInputFocusRequest}
							onSelectCommand={onSelectCommand}
							onSubmit={onSubmit}
						/>
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
			<ChatTaskDetailPanel
				isOpen={hasOpenTaskDetails}
				taskId={activeTaskId}
				onClose={onCloseTaskDetails}
			/>
		</section>
	);
}

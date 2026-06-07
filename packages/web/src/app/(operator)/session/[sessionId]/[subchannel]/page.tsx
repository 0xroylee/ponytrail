"use client";

import { useParams } from "next/navigation";
import type { ReactElement } from "react";

import { ChatRoomPanel } from "@/components/chat-room/chat-room-panel";
import {
	normalizeChatSessionSubchannel,
	readRouteParam,
} from "@/components/chat-room/chat-session-subchannels";
import { useOperatorIssueActions } from "@/components/web-shell/operator-issue-actions-context";

export default function SessionSubchannelPage(): ReactElement {
	const { commandDraftRequest, requestOpenChatSidebar } =
		useOperatorIssueActions();
	const params = useParams<{
		sessionId?: string | string[];
		subchannel?: string | string[];
	}>();
	const sessionId = readRouteParam(params.sessionId);
	const subchannel = normalizeChatSessionSubchannel(params.subchannel);

	return (
		<ChatRoomPanel
			commandDraftRequest={commandDraftRequest}
			initialSessionId={sessionId}
			initialSubchannel={subchannel}
			key={`${sessionId}:${subchannel}`}
			onOpenSidebar={requestOpenChatSidebar}
		/>
	);
}

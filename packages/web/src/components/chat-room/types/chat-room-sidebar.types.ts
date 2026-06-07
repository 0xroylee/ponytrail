import type { ChatSessionRecord, WorkspaceProjectRecord } from "@/lib/api";
import type { ChatSessionSubchannel } from "../chat-session-subchannels";

export interface ChatRoomSidebarProps {
	activeSessionId: string;
	activeSubchannel: ChatSessionSubchannel;
	error: Error | null;
	isCollapsed: boolean;
	isCreating: boolean;
	isLoading: boolean;
	isMobileOpen: boolean;
	projects: WorkspaceProjectRecord[];
	runningSessionIds: Set<string>;
	sessions: ChatSessionRecord[];
	onNewSession: () => void;
	onCloseSidebar: () => void;
	onArchiveSession: (sessionId: string) => void;
	onSearch: () => void;
	onSelectSession: (sessionId: string) => void;
	onSelectSessionSubchannel: (
		sessionId: string,
		subchannel: ChatSessionSubchannel,
	) => void;
	onToggleCollapsed: () => void;
}

export interface ChatRoomSidebarHeaderProps {
	isCollapsed: boolean;
	onToggleCollapsed: () => void;
}

export interface ChatRoomSidebarNavProps {
	isCollapsed: boolean;
	onCloseSidebar: () => void;
	onSettingsClick: () => void;
}

export interface ChatRoomSessionListProps {
	activeSessionId: string;
	activeSubchannel: ChatSessionSubchannel;
	collapsedProjectIds: Set<string>;
	error: Error | null;
	isLoading: boolean;
	pinnedSessions: ChatSessionRecord[];
	projectGroups: ChatSessionProjectGroup[];
	runningSessionIds: Set<string>;
	onArchiveSession: (sessionId: string) => void;
	onPinSession: (sessionId: string) => void;
	onSelectSession: (sessionId: string) => void;
	onSelectSessionSubchannel: (
		sessionId: string,
		subchannel: ChatSessionSubchannel,
	) => void;
	onToggleProjectGroup: (
		groupId: string,
		isExpanded: boolean,
		firstSessionId: string,
	) => void;
	onUnpinSession: (sessionId: string) => void;
}

export interface ChatSessionProjectGroup {
	id: string;
	label: string;
	isActive: boolean;
	sessions: ChatSessionRecord[];
}

export interface ChatSessionSidebarContent {
	pinnedSessions: ChatSessionRecord[];
	projectGroups: ChatSessionProjectGroup[];
}

export interface BuildChatSessionProjectGroupsInput {
	activeSessionId: string;
	projects: WorkspaceProjectRecord[];
	sessions: ChatSessionRecord[];
}

export interface BuildChatSessionSidebarContentInput
	extends BuildChatSessionProjectGroupsInput {
	pinnedSessionIds: string[];
}

export interface BuildVisibleProjectSessionsInput {
	isExpanded: boolean;
	sessions: ChatSessionRecord[];
}

export interface VisibleProjectSessions {
	hasOverflow: boolean;
	hiddenSessionCount: number;
	sessions: ChatSessionRecord[];
}

export type ProjectSessionListToggleMode = "collapsed" | "expanded";

export interface BuildProjectSessionListToggleModeInput {
	isExpanded: boolean;
	visibleProjectSessions: VisibleProjectSessions;
}

export interface ChatSessionSubchannelRow {
	href: string;
	id: ChatSessionSubchannel;
	isActive: boolean;
	label: string;
}

export interface BuildChatSessionSubchannelRowsInput {
	activeSessionId: string;
	activeSubchannel: ChatSessionSubchannel;
	sessionId: string;
}

export interface ShouldShowSessionSubchannelsInput {
	activeSessionId: string;
	sessionId: string;
}

export interface ChatRoomSessionRowProps {
	activeSessionId: string;
	activeSubchannel: ChatSessionSubchannel;
	isPinned: boolean;
	isRunning: boolean;
	session: ChatSessionRecord;
	onArchiveSession: (sessionId: string) => void;
	onPinSession: (sessionId: string) => void;
	onSelectSession: (sessionId: string) => void;
	onSelectSessionSubchannel: (
		sessionId: string,
		subchannel: ChatSessionSubchannel,
	) => void;
	onUnpinSession: (sessionId: string) => void;
}

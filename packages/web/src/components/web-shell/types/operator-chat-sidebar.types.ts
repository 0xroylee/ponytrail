import type { ChatSessionSubchannel } from "@/components/chat-room/chat-session-subchannels";

export interface OperatorChatSidebarProps {
	activeSessionId: string;
	activeSubchannel: ChatSessionSubchannel;
	isMobileOpen: boolean;
	onCloseMobileSidebar: () => void;
	onSearch: () => void;
}

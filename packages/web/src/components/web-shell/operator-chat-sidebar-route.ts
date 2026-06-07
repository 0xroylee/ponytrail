import {
	type ChatSessionSubchannel,
	DEFAULT_CHAT_SESSION_SUBCHANNEL,
	normalizeChatSessionSubchannel,
} from "@/components/chat-room/chat-session-subchannels";

const sessionRoutePrefix = "/session/";

export interface ActiveChatSessionRoute {
	sessionId: string;
	subchannel: ChatSessionSubchannel;
}

export function isChatSurfacePathname(pathname: string): boolean {
	return (
		pathname === "/chat" ||
		pathname.startsWith("/chat/") ||
		pathname.startsWith(sessionRoutePrefix)
	);
}

export function activeChatSessionIdFromPathname(pathname: string): string {
	return activeChatSessionRouteFromPathname(pathname).sessionId;
}

export function activeChatSessionSubchannelFromPathname(
	pathname: string,
): ChatSessionSubchannel {
	return activeChatSessionRouteFromPathname(pathname).subchannel;
}

export function activeChatSessionRouteFromPathname(
	pathname: string,
): ActiveChatSessionRoute {
	if (!pathname.startsWith(sessionRoutePrefix)) {
		return {
			sessionId: "",
			subchannel: DEFAULT_CHAT_SESSION_SUBCHANNEL,
		};
	}
	const [encodedSessionId = "", subchannel] = pathname
		.slice(sessionRoutePrefix.length)
		.split("/");
	if (!encodedSessionId) {
		return {
			sessionId: "",
			subchannel: DEFAULT_CHAT_SESSION_SUBCHANNEL,
		};
	}
	try {
		return {
			sessionId: decodeURIComponent(encodedSessionId),
			subchannel: normalizeChatSessionSubchannel(subchannel),
		};
	} catch {
		return {
			sessionId: encodedSessionId,
			subchannel: normalizeChatSessionSubchannel(subchannel),
		};
	}
}

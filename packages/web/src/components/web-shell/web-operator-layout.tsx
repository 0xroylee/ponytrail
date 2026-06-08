import type { ReactElement } from "react";

import { cn } from "@/lib/utils";

import type { WebOperatorLayoutProps } from "./types/web-operator-layout.types";

export function WebOperatorLayout({
	children,
	mobileSidebarTrigger,
	overlays,
	primarySidebar,
	secondarySidebar,
}: WebOperatorLayoutProps): ReactElement {
	const hasSecondarySidebar = Boolean(secondarySidebar);

	return (
		<main
			className={cn(
				"relative grid h-[100dvh] max-h-[100dvh] min-w-0 grid-cols-[5rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-x-clip bg-background",
				hasSecondarySidebar
					? "md:grid-cols-[5rem_auto_minmax(0,1fr)]"
					: "md:grid-cols-[5rem_minmax(0,1fr)]",
			)}
		>
			{primarySidebar}
			{secondarySidebar}
			{mobileSidebarTrigger}
			<div className="min-h-0 min-w-0">{children}</div>
			{overlays}
		</main>
	);
}

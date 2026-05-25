import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function TextShimmer({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}): ReactElement {
	return (
		<span className={cn("text-shimmer inline-block font-medium", className)}>
			{children}
		</span>
	);
}

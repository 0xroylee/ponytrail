"use client";

import { Pin, X } from "lucide-react";
import Link from "next/link";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/ui-store";

export function SidebarPinnedIssues({
	isExpanded,
}: {
	isExpanded: boolean;
}): ReactElement | null {
	const pinnedIssues = useUiStore((state) => state.pinnedIssues);
	const unpinIssue = useUiStore((state) => state.unpinIssue);
	if (!isExpanded || pinnedIssues.length === 0) {
		return null;
	}
	return (
		<div className="grid gap-1 border-t border-border pt-3">
			<p className="px-2 text-xs font-semibold text-muted-foreground">Pinned</p>
			{pinnedIssues.map((issue) => (
				<div className="group flex items-center gap-1" key={issue.id}>
					<Link
						className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-surface-hover hover:text-zinc-200"
						href={`/issues/${encodeURIComponent(issue.id)}`}
						title={issue.title}
					>
						<Pin className="shrink-0" size={13} />
						<span className="truncate">{issue.taskKey}</span>
						<span className="truncate text-muted-foreground/80">
							{issue.title}
						</span>
					</Link>
					<Button
						aria-label={`Unpin ${issue.taskKey}`}
						className="h-7 w-7 shrink-0 text-muted-foreground/80 opacity-0 hover:bg-surface-hover hover:text-zinc-200 group-hover:opacity-100"
						onClick={() => unpinIssue(issue.id)}
						size="icon"
						type="button"
						variant="ghost"
					>
						<X size={13} />
					</Button>
				</div>
			))}
		</div>
	);
}

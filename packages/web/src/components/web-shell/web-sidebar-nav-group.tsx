import {
	BookOpen,
	Bot,
	ChartColumn,
	Computer,
	Inbox,
	ListChecks,
	Settings,
	Sparkles,
	SquareKanban,
	UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType, ReactElement } from "react";

import type { SidebarNavItem } from "@/components/web-shell/web-shell.types";
import { cn } from "@/lib/utils";

const iconByKey: Record<
	SidebarNavItem["key"],
	ComponentType<{ size?: number }>
> = {
	agents: Bot,
	runtimes: Computer,
	skills: BookOpen,
	settings: Settings,
	issues: ListChecks,
	projects: SquareKanban,
	inbox: Inbox,
	autopilot: Sparkles,
	squads: UsersRound,
	usage: ChartColumn,
};

type SidebarNavGroupProps = {
	title: string;
	items: SidebarNavItem[];
	activeKey: SidebarNavItem["key"];
	isExpanded: boolean;
};

export function SidebarNavGroup({
	title,
	items,
	activeKey,
	isExpanded,
}: SidebarNavGroupProps): ReactElement {
	return (
		<div className="grid gap-1">
			{isExpanded ? (
				<p className="mb-1 px-2 text-[0.6875rem] font-medium text-[var(--text-muted)]">
					{title}
				</p>
			) : null}
			{items.map((item) => {
				const Icon = iconByKey[item.key];
				const isActive = item.key === activeKey;
				return (
					<Link
						aria-current={isActive ? "page" : undefined}
						className={cn(
							"flex h-10 items-center gap-3 rounded-md px-2 text-xs font-normal",
							isActive
								? "bg-[var(--bg-active)] text-[var(--text-primary)]"
								: "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]",
							!isExpanded && "justify-center",
						)}
						href={item.href}
						key={item.key}
						title={item.label}
					>
						<Icon size={18} />
						{isExpanded ? <span>{item.label}</span> : null}
					</Link>
				);
			})}
		</div>
	);
}

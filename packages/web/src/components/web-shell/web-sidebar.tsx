"use client";

import { CircleHelp, PanelLeft, PencilLine, Search } from "lucide-react";
import type { ReactElement } from "react";

import type {
	SidebarDisplayMode,
	SidebarNavItem,
} from "@/components/web-shell/web-shell.types";
import type { ThemePreference } from "@/lib/theme/theme.types";
import { SidebarAction } from "./web-sidebar-action";
import { SidebarNavGroup } from "./web-sidebar-nav-group";
import { SidebarPinnedIssues } from "./web-sidebar-pins";
import { ThemePreferenceIcon, themeLabel } from "./web-sidebar-theme-toggle";

interface WebSidebarProps {
	mode: SidebarDisplayMode;
	activeKey: SidebarNavItem["key"];
	navItems: SidebarNavItem[];
	onNewIssue: () => void;
	onSearch: () => void;
	onToggleMode: () => void;
	themePreference: ThemePreference;
	onCycleThemePreference: () => void;
}

function nextSidebarLabel(mode: SidebarDisplayMode): string {
	if (mode === "expanded") {
		return "Collapse sidebar";
	}
	if (mode === "collapsed") {
		return "Expand sidebar";
	}
	return "Show sidebar";
}

export function WebSidebar({
	mode,
	activeKey,
	navItems,
	onNewIssue,
	onSearch,
	onToggleMode,
	themePreference,
	onCycleThemePreference,
}: WebSidebarProps): ReactElement {
	const isExpanded = mode === "expanded";
	const isHidden = mode === "hidden";
	return (
		<aside
			aria-label="Primary navigation"
			className="grid h-[100dvh] max-h-[100dvh] border-r text-[var(--text-secondary)]"
			style={{
				background: "var(--bg-sidebar)",
				borderColor: "var(--border-subtle)",
				width: isHidden ? "0" : isExpanded ? "14rem" : "6.5rem",
				opacity: isHidden ? 0 : 1,
				pointerEvents: isHidden ? "none" : "auto",
				transition: "width 180ms ease, opacity 120ms ease",
				overflow: "hidden",
				gridTemplateRows: "auto auto 1fr auto",
			}}
		>
			<header className="flex items-center gap-3 p-4">
				<span
					className="grid h-7 w-7 shrink-0 place-items-center rounded-md border text-sm font-semibold"
					style={{
						background: "var(--bg-surface)",
						borderColor: "var(--border-default)",
						color: "var(--text-primary)",
					}}
				>
					R
				</span>
				{isExpanded ? (
					<strong className="truncate text-xs font-medium text-[var(--text-primary)]">
						Roy Lee&apos;s Workspace
					</strong>
				) : null}
				<button
					aria-label={nextSidebarLabel(mode)}
					className="ml-auto grid h-8 w-8 place-items-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
					onClick={onToggleMode}
					title={nextSidebarLabel(mode)}
					type="button"
				>
					<PanelLeft size={16} />
				</button>
			</header>
			<div className="grid gap-2 px-3 pb-4">
				<SidebarAction
					icon={Search}
					isExpanded={isExpanded}
					label="Search..."
					onClick={onSearch}
				/>
				<SidebarAction
					icon={PencilLine}
					isExpanded={isExpanded}
					label="New Issue"
					onClick={onNewIssue}
				/>
				<SidebarPinnedIssues isExpanded={isExpanded} />
			</div>
			<nav className="grid content-start gap-6 px-3">
				<SidebarNavGroup
					activeKey={activeKey}
					isExpanded={isExpanded}
					items={navItems.slice(0, 7)}
					title="Workspace"
				/>
				<SidebarNavGroup
					activeKey={activeKey}
					isExpanded={isExpanded}
					items={navItems.slice(7)}
					title="Configure"
				/>
			</nav>
			<footer className="flex items-center p-4">
				{isExpanded ? (
					<span className="text-xs text-[var(--text-muted)]">devos.ing</span>
				) : null}
				<div className="ml-auto flex items-center gap-2 text-[var(--text-muted)]">
					<CircleHelp size={16} />
					<button
						aria-label={themeLabel(themePreference)}
						className="grid h-8 w-8 place-items-center rounded-md border bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
						onClick={onCycleThemePreference}
						style={{ borderColor: "var(--border-default)" }}
						title={`${themeLabel(themePreference)} (click to cycle)`}
						type="button"
					>
						<ThemePreferenceIcon preference={themePreference} />
					</button>
				</div>
			</footer>
		</aside>
	);
}

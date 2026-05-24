import type { ComponentType, ReactElement } from "react";

import { cn } from "@/lib/utils";

type SidebarActionProps = {
	icon: ComponentType<{ size?: number }>;
	isExpanded: boolean;
	label: string;
	onClick?: () => void;
};

export function SidebarAction({
	icon: Icon,
	isExpanded,
	label,
	onClick,
}: SidebarActionProps): ReactElement {
	return (
		<button
			className={cn(
				"flex h-9 items-center gap-3 rounded-md px-2 text-xs font-normal text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]",
				!isExpanded && "justify-center",
			)}
			onClick={onClick}
			type="button"
		>
			<Icon size={18} />
			{isExpanded ? <span>{label}</span> : null}
		</button>
	);
}

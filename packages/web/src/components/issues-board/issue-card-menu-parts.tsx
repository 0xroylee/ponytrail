import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

export function MenuField({
	children,
	label,
}: {
	children: ReactElement;
	label: string;
}): ReactElement {
	return (
		<div className="grid gap-1 text-xs text-muted-foreground">
			<Typography variant="muted">{label}</Typography>
			{children}
		</div>
	);
}

export function MenuButton({
	danger = false,
	icon,
	label,
	onClick,
}: {
	danger?: boolean;
	icon: ReactElement;
	label: string;
	onClick: () => void;
}): ReactElement {
	return (
		<Button
			className={`h-8 justify-start gap-2 px-2 text-sm ${
				danger
					? "text-red-300 hover:bg-red-950/40"
					: "text-zinc-300 hover:bg-surface-active"
			}`}
			onClick={onClick}
			size="sm"
			type="button"
			variant="ghost"
		>
			{icon}
			<Typography as="span">{label}</Typography>
		</Button>
	);
}

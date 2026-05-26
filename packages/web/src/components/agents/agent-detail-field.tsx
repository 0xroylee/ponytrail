import type { ReactElement } from "react";

import { Typography } from "@/components/ui/typography";

export function AgentDetailField({
	children,
	label,
}: {
	children: ReactElement;
	label: string;
}): ReactElement {
	return (
		<div className="grid gap-1.5">
			<Typography className="text-zinc-400" variant="label">
				{label}
			</Typography>
			{children}
		</div>
	);
}

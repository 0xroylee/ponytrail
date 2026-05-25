"use client";

import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import type { TaskClarificationOption } from "@/lib/api";

interface ClarificationOptionButtonProps {
	disabled?: boolean;
	option: TaskClarificationOption;
	selected: boolean;
	onSelect: (value: string) => void;
}

export function ClarificationOptionButton({
	disabled,
	option,
	selected,
	onSelect,
}: ClarificationOptionButtonProps): ReactElement {
	return (
		<Button
			disabled={disabled}
			onClick={() => onSelect(option.value)}
			size="sm"
			type="button"
			variant={selected ? "default" : "secondary"}
		>
			<span>{option.label}</span>
			{option.recommended ? (
				<span className="rounded-sm border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-200">
					Recommended
				</span>
			) : null}
		</Button>
	);
}

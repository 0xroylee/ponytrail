"use client";

import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ProjectRepositoryMode } from "./types/projects-panel.types";

interface ProjectRepositoryModeButtonProps {
	icon: ReactElement;
	isActive: boolean;
	label: string;
	mode: ProjectRepositoryMode;
	onSelect: (mode: ProjectRepositoryMode) => void;
}

export function ProjectRepositoryModeButton({
	icon,
	isActive,
	label,
	mode,
	onSelect,
}: ProjectRepositoryModeButtonProps): ReactElement {
	return (
		<Button
			aria-pressed={isActive}
			className={cn(isActive ? "border-zinc-500 bg-surface-active" : "")}
			onClick={() => onSelect(mode)}
			size="sm"
			type="button"
			variant="outline"
		>
			{icon}
			{label}
		</Button>
	);
}

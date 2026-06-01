"use client";

import { LayoutGrid, List, Search } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import type { ProjectTableDensity } from "./types/projects-panel.types";

interface ProjectsToolbarProps {
	density: ProjectTableDensity;
	filteredCount: number;
	searchQuery: string;
	totalCount: number;
	onDensityChange: (density: ProjectTableDensity) => void;
	onSearchChange: (value: string) => void;
}

export function ProjectsToolbar({
	density,
	filteredCount,
	searchQuery,
	totalCount,
	onDensityChange,
	onSearchChange,
}: ProjectsToolbarProps): ReactElement {
	return (
		<div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
			<label
				className="relative min-w-60 flex-1 sm:max-w-sm"
				htmlFor="projects-search"
			>
				<Search
					className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
					size={16}
				/>
				<Input
					aria-label="Search projects"
					className="pl-9"
					id="projects-search"
					onChange={(event) => onSearchChange(event.target.value)}
					placeholder="Search projects..."
					value={searchQuery}
				/>
			</label>
			<div className="ml-auto flex flex-wrap items-center gap-3">
				<Typography className="whitespace-nowrap" variant="description">
					{filteredCount} / {totalCount}
				</Typography>
				<div className="inline-flex rounded-lg border border-border bg-card p-1">
					<DensityButton
						density="compact"
						icon={<List size={15} />}
						isActive={density === "compact"}
						label="Compact"
						onSelect={onDensityChange}
					/>
					<DensityButton
						density="comfortable"
						icon={<LayoutGrid size={15} />}
						isActive={density === "comfortable"}
						label="Comfortable"
						onSelect={onDensityChange}
					/>
				</div>
			</div>
		</div>
	);
}

function DensityButton({
	density,
	icon,
	isActive,
	label,
	onSelect,
}: {
	density: ProjectTableDensity;
	icon: ReactElement;
	isActive: boolean;
	label: string;
	onSelect: (density: ProjectTableDensity) => void;
}): ReactElement {
	return (
		<Button
			className={cn(
				"h-8 gap-2 px-2.5",
				isActive
					? "bg-surface-active text-zinc-100"
					: "text-muted-foreground hover:text-zinc-200",
			)}
			onClick={() => onSelect(density)}
			size="sm"
			type="button"
			variant="ghost"
		>
			{icon}
			<Typography as="span">{label}</Typography>
		</Button>
	);
}

"use client";

import { Plus, RefreshCw, Search } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";

import { ProjectMetric } from "./project-metric";

interface ProjectsPanelHeaderProps {
	canCreate: boolean;
	filteredCount: number;
	isWorkspaceLoading: boolean;
	projectCount: number;
	projectsWithRepository: number;
	searchQuery: string;
	onCreateProject: () => void;
	onRefreshProjects: () => void;
	onSearchChange: (value: string) => void;
}

export function ProjectsPanelHeader({
	canCreate,
	filteredCount,
	isWorkspaceLoading,
	projectCount,
	projectsWithRepository,
	searchQuery,
	onCreateProject,
	onRefreshProjects,
	onSearchChange,
}: ProjectsPanelHeaderProps): ReactElement {
	return (
		<header className="grid gap-4 border-b border-border p-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2">
					<Typography className="truncate" variant="pageTitle">
						Projects
					</Typography>
					<Typography variant="description">{projectCount}</Typography>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						aria-label="Refresh projects"
						onClick={onRefreshProjects}
						size="icon"
						type="button"
						variant="ghost"
					>
						<RefreshCw size={16} />
					</Button>
					<Button
						disabled={!canCreate || isWorkspaceLoading}
						onClick={onCreateProject}
						size="sm"
						type="button"
					>
						<Plus size={16} />
						New project
					</Button>
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-3">
				<label
					className="relative min-w-[16rem] flex-1"
					htmlFor="projects-search"
				>
					<Search
						className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
						size={16}
					/>
					<Input
						aria-label="Search projects"
						className="h-11 pl-9 text-base"
						id="projects-search"
						onChange={(event) => onSearchChange(event.target.value)}
						placeholder="Search projects..."
						value={searchQuery}
					/>
				</label>
				<Typography className="text-sm text-zinc-400">
					{filteredCount} of {projectCount}
				</Typography>
			</div>
			<div className="flex flex-wrap gap-2">
				<ProjectMetric label="All" value={projectCount} />
				<ProjectMetric label="With repo" value={projectsWithRepository} />
				<ProjectMetric
					label="Missing repo"
					value={projectCount - projectsWithRepository}
				/>
			</div>
		</header>
	);
}

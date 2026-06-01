"use client";

import { GitBranch, Lock, Search } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { useGitHubRepositorySearchQuery } from "@/lib/api/queries";
import { cn } from "@/lib/utils";

import { repositorySelectionFromSearchResult } from "./project-form-utils";
import type {
	ProjectRepositoryPickerResult,
	ProjectRepositorySelection,
} from "./types/projects-panel.types";

interface ProjectRepositoryPickerProps {
	query: string;
	selection: ProjectRepositorySelection | null;
	onQueryChange: (value: string) => void;
	onSelectionChange: (selection: ProjectRepositorySelection | null) => void;
}

export function ProjectRepositoryPicker({
	query,
	selection,
	onQueryChange,
	onSelectionChange,
}: ProjectRepositoryPickerProps): ReactElement {
	const searchQuery = useGitHubRepositorySearchQuery(query, {
		enabled: query.trim().length >= 2,
		refetchIntervalMs: false,
	});
	const results = searchQuery.data ?? [];

	function updateQuery(value: string): void {
		onQueryChange(value);
		if (selection && value.trim() !== selection.fullName) {
			onSelectionChange(null);
		}
	}

	function selectResult(result: ProjectRepositoryPickerResult): void {
		const next = repositorySelectionFromSearchResult(result);
		onSelectionChange(next);
		onQueryChange(next.fullName);
	}

	return (
		<div className="grid gap-2 sm:col-span-2">
			<Typography as="label" className="grid gap-1" variant="label">
				<Typography as="span" className="text-zinc-400" variant="label">
					Repository
				</Typography>
				<span className="relative">
					<Search
						className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
						size={15}
					/>
					<Input
						className="pl-9"
						onChange={(event) => updateQuery(event.target.value)}
						placeholder="Search GitHub repositories or enter owner/repo"
						value={query}
					/>
				</span>
			</Typography>
			{selection ? (
				<Typography className="text-emerald-300" variant="description">
					Selected {selection.fullName} on {selection.defaultBranch}
				</Typography>
			) : null}
			{searchQuery.error ? (
				<Typography variant="error">{searchQuery.error.message}</Typography>
			) : null}
			{searchQuery.isFetching ? (
				<Typography variant="description">Searching GitHub...</Typography>
			) : null}
			{results.length > 0 ? (
				<div className="max-h-56 overflow-auto rounded-md border border-border bg-surface-input">
					{results.map((result) => (
						<Button
							className={cn(
								"grid h-auto w-full grid-cols-[1fr_auto] gap-2 rounded-none border-b border-border px-3 py-2 text-left last:border-b-0",
								selection?.fullName === result.fullName
									? "bg-surface-active"
									: "bg-transparent",
							)}
							key={result.id}
							onClick={() => selectResult(result)}
							type="button"
							variant="ghost"
						>
							<span className="min-w-0">
								<Typography className="truncate" variant="tableCell">
									{result.fullName}
								</Typography>
								<Typography className="truncate" variant="muted">
									{result.description ?? result.htmlUrl}
								</Typography>
							</span>
							<span className="flex items-center gap-2 text-muted-foreground">
								{result.isPrivate ? <Lock size={13} /> : null}
								<GitBranch size={13} />
								<Typography as="span" variant="description">
									{result.defaultBranch}
								</Typography>
							</span>
						</Button>
					))}
				</div>
			) : null}
		</div>
	);
}

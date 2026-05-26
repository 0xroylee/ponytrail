"use client";

import { Folder } from "lucide-react";
import type { ReactElement } from "react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import type {
	ProjectDisplayRow,
	ProjectTableDensity,
} from "./types/projects-panel.types";

const PROJECT_TABLE_COLUMN_COUNT = 6;

interface ProjectsTableProps {
	density: ProjectTableDensity;
	error: Error | null;
	isLoading: boolean;
	rows: ProjectDisplayRow[];
	searchQuery: string;
	totalCount: number;
}

export function ProjectsTable({
	density,
	error,
	isLoading,
	rows,
	searchQuery,
	totalCount,
}: ProjectsTableProps): ReactElement {
	const rowPadding = density === "compact" ? "px-4 py-2.5" : "px-4 py-4";
	const stateLabel = resolveProjectTableState({
		error,
		isLoading,
		rowCount: rows.length,
		searchQuery,
		totalCount,
	});

	return (
		<section className="min-h-0 overflow-hidden rounded-lg border border-border bg-surface-input">
			<div className="h-full overflow-x-auto">
				<table className="h-full w-full min-w-[58rem] table-fixed border-collapse">
					<colgroup>
						<col className="w-[34%]" />
						<col className="w-[10%]" />
						<col className="w-[14%]" />
						<col className="w-[18%]" />
						<col className="w-[12%]" />
						<col className="w-[12%]" />
					</colgroup>
					<thead className="bg-card text-left text-xs font-medium text-muted-foreground">
						<tr className="border-b border-border">
							<TableHeaderCell label="Name" />
							<TableHeaderCell label="Priority" />
							<TableHeaderCell label="Category" />
							<TableHeaderCell label="Repository" />
							<TableHeaderCell label="Lead" />
							<TableHeaderCell label="Created" />
						</tr>
					</thead>
					<tbody className="text-sm text-zinc-300">
						{stateLabel ? (
							<tr>
								<Typography
									as="td"
									className="h-72 px-4 text-center"
									colSpan={PROJECT_TABLE_COLUMN_COUNT}
									variant="description"
								>
									{stateLabel}
								</Typography>
							</tr>
						) : (
							rows.map((row) => (
								<ProjectTableRow
									key={row.project.id}
									row={row}
									rowPadding={rowPadding}
								/>
							))
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function TableHeaderCell({ label }: { label: string }): ReactElement {
	return (
		<Typography
			as="th"
			className="h-10 whitespace-nowrap px-4 align-middle"
			variant="tableHeader"
		>
			{label}
		</Typography>
	);
}

function ProjectTableRow({
	row,
	rowPadding,
}: {
	row: ProjectDisplayRow;
	rowPadding: string;
}): ReactElement {
	return (
		<tr className="border-b border-border/80 last:border-b-0 hover:bg-surface-hover/60">
			<td className={cn(rowPadding, "align-middle")}>
				<div className="flex min-w-0 items-center gap-3">
					<span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-zinc-700 bg-surface-hover text-zinc-400">
						<Folder size={14} />
					</span>
					<div className="min-w-0">
						<Typography className="truncate" variant="cardTitle">
							{row.project.name}
						</Typography>
						<Typography className="truncate" variant="muted">
							{row.summaryLabel}
						</Typography>
					</div>
				</div>
			</td>
			<TableCell
				className="font-medium text-zinc-200"
				rowPadding={rowPadding}
				value={row.priorityLabel}
			/>
			<TableCell rowPadding={rowPadding} value={row.categoryLabel} />
			<TableCell rowPadding={rowPadding} value={row.repositoryLabel} />
			<TableCell rowPadding={rowPadding} value={row.leadLabel} />
			<Typography
				as="td"
				className={cn(rowPadding, "truncate align-middle")}
				variant="description"
			>
				<Typography
					as="time"
					dateTime={row.project.createdAt}
					variant="description"
				>
					{row.createdLabel}
				</Typography>
			</Typography>
		</tr>
	);
}

function TableCell({
	className,
	rowPadding,
	value,
}: {
	className?: string;
	rowPadding: string;
	value: string;
}): ReactElement {
	return (
		<Typography
			as="td"
			className={cn(rowPadding, "truncate align-middle", className)}
			variant="tableCell"
		>
			{value}
		</Typography>
	);
}

function resolveProjectTableState({
	error,
	isLoading,
	rowCount,
	searchQuery,
	totalCount,
}: {
	error: Error | null;
	isLoading: boolean;
	rowCount: number;
	searchQuery: string;
	totalCount: number;
}): string | null {
	if (isLoading) {
		return "Loading projects";
	}
	if (error) {
		return error.message;
	}
	if (totalCount === 0) {
		return "No projects yet";
	}
	if (rowCount === 0 && searchQuery.trim()) {
		return "No projects match this search";
	}
	return null;
}

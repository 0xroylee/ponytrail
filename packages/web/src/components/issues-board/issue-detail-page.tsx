"use client";

import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { useBoardTaskQuery } from "@/lib/api/queries";

import { IssueActivityPanel } from "./issue-activity";
import { IssueDetailEditor } from "./issue-detail-editor";

export function IssueDetailPage(): ReactElement {
	const router = useRouter();
	const params = useParams<{ taskId?: string | string[] }>();
	const taskId = readTaskId(params.taskId);
	const taskQuery = useBoardTaskQuery(taskId);

	function navigateBack(): void {
		router.push("/issues");
	}

	return (
		<section className="h-[100dvh] max-h-[100dvh] overflow-y-auto bg-background text-zinc-100">
			<header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-inset px-5 py-4">
				<div>
					<Typography className="mb-1" variant="description">
						Roy Lee&apos;s Workspace / Issues /
					</Typography>
					<Typography variant="pageTitle">Task details</Typography>
				</div>
				<Button onClick={navigateBack} type="button" variant="secondary">
					<ArrowLeft size={16} />
					Issues
				</Button>
			</header>
			<div className="mx-auto grid max-w-5xl gap-5 px-5 py-6">
				{renderDetailContent(taskQuery, taskId)}
			</div>
		</section>
	);
}

function renderDetailContent(
	taskQuery: ReturnType<typeof useBoardTaskQuery>,
	taskId: string,
): ReactElement {
	if (!taskId) {
		return <DetailState label="Task not found" />;
	}
	if (taskQuery.isLoading) {
		return <DetailState label="Loading task" />;
	}
	if (taskQuery.error) {
		return <DetailState label={taskQuery.error.message} />;
	}
	if (!taskQuery.data) {
		return <DetailState label="Task not found" />;
	}
	return (
		<>
			<IssueDetailEditor task={taskQuery.data} />
			<IssueActivityPanel task={taskQuery.data} />
		</>
	);
}

function DetailState({ label }: { label: string }): ReactElement {
	return (
		<div className="grid min-h-[24rem] place-items-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
			<Typography variant="description">{label}</Typography>
		</div>
	);
}

function readTaskId(value: string | string[] | undefined): string {
	if (Array.isArray(value)) {
		return value[0] ?? "";
	}
	return value ?? "";
}

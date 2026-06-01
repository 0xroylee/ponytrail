"use client";

import { ExternalLink, GitBranch, Plug, RefreshCw, Unplug } from "lucide-react";
import { type ReactElement, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import {
	useDisconnectGitHubMutation,
	useStartGitHubDeviceFlowMutation,
} from "@/lib/api/github-mutations";
import {
	useGitHubConnectionQuery,
	useGitHubDevicePollQuery,
	useGitHubRepositoriesQuery,
} from "@/lib/api/realtime-queries";
import type { GitHubDeviceStartResponse } from "@/lib/api/types/client.types";

import { buildGitHubIntegrationState } from "./integrations-panel-utils";

const NO_REFETCH = { refetchIntervalMs: false } as const;

export function IntegrationsPanel(): ReactElement {
	const [clientIdInput, setClientIdInput] = useState("");
	const [deviceFlow, setDeviceFlow] =
		useState<GitHubDeviceStartResponse | null>(null);
	const connectionQuery = useGitHubConnectionQuery(NO_REFETCH);
	const devicePollQuery = useGitHubDevicePollQuery(
		deviceFlow,
		deviceFlow !== null,
	);
	const effectiveConnection =
		devicePollQuery.data?.connection ?? connectionQuery.data;
	const repositoriesQuery = useGitHubRepositoriesQuery({
		enabled: effectiveConnection?.isConnected === true,
		refetchIntervalMs: false,
	});
	const disconnectMutation = useDisconnectGitHubMutation();
	const startDeviceFlowMutation = useStartGitHubDeviceFlowMutation();
	const state = buildGitHubIntegrationState({
		connection: effectiveConnection,
		isConnectionError: connectionQuery.isError,
		isConnectionLoading: connectionQuery.isLoading,
		isRepositoryError: repositoriesQuery.isError,
		isRepositoryLoading: repositoriesQuery.isLoading,
		repositoryCount: repositoriesQuery.data?.repositories.length ?? 0,
		repositoryUnavailableReason:
			repositoriesQuery.data?.unavailableReason ?? null,
	});
	const deviceMessage =
		devicePollQuery.data?.message ??
		(deviceFlow ? "Waiting for GitHub authorization" : null);

	async function connectGitHub(): Promise<void> {
		const clientId = clientIdInput.trim();
		if (state.needsClientId && !clientId) {
			toast.error("GitHub client ID is required");
			return;
		}
		try {
			const flow = await startDeviceFlowMutation.mutateAsync({
				clientId: clientId || undefined,
			});
			setDeviceFlow(flow);
			window.open(flow.verificationUri, "_blank", "noopener,noreferrer");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Connect failed");
		}
	}

	function refreshGitHub(): void {
		void connectionQuery.refetch().then((result) => {
			if (result.data?.isConnected === true) {
				void repositoriesQuery.refetch();
			}
		});
	}

	async function disconnectGitHub(): Promise<void> {
		try {
			await disconnectMutation.mutateAsync();
			setDeviceFlow(null);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Disconnect failed");
		}
	}

	return (
		<section className="flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] min-h-[28rem] flex-col overflow-hidden rounded-lg border border-border bg-card text-zinc-100">
			<header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
				<div className="min-w-0">
					<Typography className="truncate" variant="pageTitle">
						Integrations
					</Typography>
					<Typography className="mt-1" variant="description">
						Workspace services and connection health.
					</Typography>
				</div>
				<Button
					aria-label="Refresh integrations"
					disabled={connectionQuery.isFetching || repositoriesQuery.isFetching}
					onClick={refreshGitHub}
					size="icon"
					type="button"
					variant="ghost"
				>
					<RefreshCw size={16} />
				</Button>
			</header>
			<div className="min-h-0 overflow-auto">
				<article className="grid gap-4 border-b border-border p-4">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="flex min-w-0 items-center gap-3">
							<span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border bg-surface-panel">
								<GitBranch size={20} />
							</span>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<Typography variant="sectionTitle">GitHub</Typography>
									<span className="rounded-md border border-border bg-surface-panel px-2 py-1 text-xs text-zinc-300">
										{state.statusLabel}
									</span>
								</div>
								<Typography className="mt-1 truncate" variant="muted">
									{state.detail}
								</Typography>
							</div>
						</div>
						<div className="flex flex-wrap justify-start gap-2 md:justify-end">
							{state.canDisconnect ? (
								<Button
									disabled={disconnectMutation.isPending}
									onClick={() => void disconnectGitHub()}
									size="sm"
									type="button"
									variant="outline"
								>
									<Unplug size={15} />
									Disconnect
								</Button>
							) : (
								<Button
									disabled={
										!state.canConnect || startDeviceFlowMutation.isPending
									}
									onClick={() => void connectGitHub()}
									size="sm"
									type="button"
								>
									<Plug size={15} />
									Connect GitHub
								</Button>
							)}
						</div>
					</div>
					<div className="grid gap-1 pl-[3.25rem]">
						<Typography variant="label">Repository access</Typography>
						<Typography className="block truncate" variant="muted">
							{state.repositorySummary}
						</Typography>
					</div>
					{state.needsClientId ? (
						<div className="grid gap-2 pl-[3.25rem] sm:grid-cols-[minmax(0,1fr)_auto]">
							<Input
								aria-label="GitHub OAuth app client ID"
								onChange={(event) => setClientIdInput(event.target.value)}
								placeholder="GitHub OAuth app client ID"
								value={clientIdInput}
							/>
							<Button
								disabled={
									!clientIdInput.trim() || startDeviceFlowMutation.isPending
								}
								onClick={() => void connectGitHub()}
								type="button"
							>
								<Plug size={15} />
								Start device flow
							</Button>
						</div>
					) : null}
					{deviceFlow && !state.canDisconnect ? (
						<div className="grid gap-3 rounded-md border border-border bg-surface-panel p-3 md:ml-[3.25rem]">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div className="min-w-0">
									<Typography variant="label">
										GitHub verification code
									</Typography>
									<Typography className="mt-1" variant="muted">
										{deviceMessage}
									</Typography>
								</div>
								<div className="rounded-md border border-border bg-surface-input px-3 py-2 font-mono text-base text-zinc-100">
									{deviceFlow.userCode}
								</div>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button asChild size="sm" type="button" variant="outline">
									<a
										href={deviceFlow.verificationUri}
										rel="noreferrer"
										target="_blank"
									>
										<ExternalLink size={15} />
										Open GitHub
									</a>
								</Button>
								<Button
									disabled={devicePollQuery.isFetching}
									onClick={() => void devicePollQuery.refetch()}
									size="sm"
									type="button"
									variant="secondary"
								>
									<RefreshCw size={15} />
									Check status
								</Button>
							</div>
						</div>
					) : null}
				</article>
			</div>
		</section>
	);
}

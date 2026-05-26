"use client";

import {
	Asterisk,
	BookOpen,
	Code2,
	Lightbulb,
	PanelLeft,
	PenLine,
} from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { useWorkflowComputersQuery } from "@/lib/api/queries";

import { ChatComposer } from "./chat-composer";
import type { ChatComposerProps } from "./types/chat-room.types";

const promptChips = [
	{ icon: Code2, label: "Code", draft: "/run " },
	{ icon: PenLine, label: "Write", draft: "Draft a plan for " },
	{ icon: BookOpen, label: "Learn", draft: "Explain " },
	{ icon: Lightbulb, label: "Decide", draft: "Help me choose between " },
];

const daemonSetupCommands = [
	"npx devos onboard",
	"npx devos onboard --check",
	"devos daemon",
];

interface ChatNoSessionHomeProps extends ChatComposerProps {
	sidebarControlId: string;
}

export function ChatNoSessionHome({
	sidebarControlId,
	onSelectCommand,
	...composerProps
}: ChatNoSessionHomeProps): ReactElement {
	return (
		<div className="relative grid min-h-0 min-w-0 place-items-center px-4 py-8 text-zinc-100">
			<Button
				asChild
				className="absolute left-4 top-4 cursor-pointer md:hidden"
				size="icon"
				variant="ghost"
			>
				<label aria-label="Open chat sidebar" htmlFor={sidebarControlId}>
					<PanelLeft size={17} />
				</label>
			</Button>
			<div className="grid w-full max-w-5xl -translate-y-8 gap-8">
				<div className="flex flex-wrap items-center justify-center gap-4 text-center">
					<DevosMark size={44} />
					<h1 className="m-0 font-serif text-4xl font-normal leading-tight text-zinc-300 sm:text-5xl">
						Back at it, roy
					</h1>
				</div>
				<ChatComposer
					{...composerProps}
					onSelectCommand={onSelectCommand}
					placeholder="Tell devos.ing what you are working on"
					presentation="hero"
				/>
				<div className="flex flex-wrap justify-center gap-2">
					{promptChips.map((chip) => {
						const Icon = chip.icon;
						return (
							<Button
								className="h-9 rounded-md border-zinc-700/70 bg-surface-active px-3 text-zinc-300 hover:bg-surface-hover hover:text-zinc-100"
								key={chip.label}
								onClick={() => onSelectCommand(chip.draft)}
								type="button"
								variant="secondary"
							>
								<Icon size={16} />
								{chip.label}
							</Button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

export function ChatSelectedSessionWelcome(): ReactElement {
	const computersQuery = useWorkflowComputersQuery({ refetchIntervalMs: 5000 });
	const showDaemonSetup =
		computersQuery.isSuccess &&
		!computersQuery.data.some((computer) => computer.status === "online");

	return (
		<div className="mx-auto grid w-full max-w-3xl gap-8 pt-[9dvh] text-left">
			<div className="grid gap-5">
				<h2 className="m-0 font-serif text-3xl font-normal leading-tight text-zinc-200 sm:text-4xl">
					Welcome, roy. I am devos.ing.
				</h2>
				<p className="m-0 max-w-3xl font-serif text-xl leading-8 text-zinc-200">
					Bring me a tricky workflow, a half-formed idea, or something you need
					to ship. We will figure it out together.
				</p>
				<p className="m-0 font-serif text-2xl leading-8 text-zinc-200">
					Where do you want to start?
				</p>
			</div>
			<DevosMark size={44} />
			{showDaemonSetup ? (
				<pre className="m-0 max-w-full overflow-x-auto rounded-md border border-border bg-surface-panel px-4 py-3 font-mono text-xs leading-6 text-zinc-300">
					{daemonSetupCommands.join("\n")}
				</pre>
			) : null}
		</div>
	);
}

function DevosMark({ size }: { size: number }): ReactElement {
	return (
		<Asterisk
			aria-hidden="true"
			className="shrink-0 text-[hsl(var(--accent-warm))]"
			size={size}
			strokeWidth={2.4}
		/>
	);
}

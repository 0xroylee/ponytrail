import type { ReactElement } from "react";

import { RuntimesPanel } from "@/components/runtimes/runtimes-panel";
import { Typography } from "@/components/ui/typography";

export default function RuntimesPage(): ReactElement {
	return (
		<section className="grid h-[100dvh] max-h-[100dvh] content-start gap-4 overflow-auto p-[clamp(0.75rem,3vw,1.25rem)]">
			<header className="grid gap-1">
				<Typography variant="pageTitle">Runtimes</Typography>
				<Typography variant="description">
					Configured agent runtime coverage and capacity.
				</Typography>
			</header>
			<RuntimesPanel />
		</section>
	);
}

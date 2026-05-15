import type { ReactElement } from "react";

import { AgentsPanel } from "@/components/agents/agents-panel";

export default function AgentsPage(): ReactElement {
	return (
		<section
			style={{
				padding: "clamp(0.75rem, 3vw, 1.25rem)",
				display: "grid",
				gap: "1rem",
				alignContent: "start",
				minHeight: "100vh",
				minWidth: 0,
			}}
		>
			<AgentsPanel />
		</section>
	);
}

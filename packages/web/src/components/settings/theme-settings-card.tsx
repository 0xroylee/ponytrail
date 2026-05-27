"use client";

import { useTheme } from "next-themes";
import { type ReactElement, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

export function ThemeSettingsCard(): ReactElement {
	const { resolvedTheme, setTheme } = useTheme();
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const activeTheme = isMounted && resolvedTheme === "dark" ? "dark" : "light";

	return (
		<section
			style={{
				border: "1px solid hsl(var(--border))",
				borderRadius: "8px",
				background: "hsl(var(--card))",
				padding: "1rem",
				display: "grid",
				gap: "0.75rem",
			}}
		>
			<div className="grid gap-1">
				<Typography variant="cardTitle">Theme</Typography>
				<Typography variant="description">
					Choose light or dark appearance for the operator workspace.
				</Typography>
			</div>
			<div className="flex flex-wrap gap-2">
				<Button
					onClick={() => setTheme("light")}
					type="button"
					variant={activeTheme === "light" ? "default" : "outline"}
				>
					Light
				</Button>
				<Button
					onClick={() => setTheme("dark")}
					type="button"
					variant={activeTheme === "dark" ? "default" : "outline"}
				>
					Dark
				</Button>
				<Button
					onClick={() =>
						toast.success(`Theme preview: ${activeTheme}`, {
							description: "Notification follows the active theme.",
						})
					}
					type="button"
					variant="secondary"
				>
					Show notification
				</Button>
			</div>
		</section>
	);
}

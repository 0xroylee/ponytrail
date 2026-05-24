import type { Metadata } from "next";
import Script from "next/script";
import type { ReactElement, ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";
import { getThemeInitScript } from "@/lib/theme/theme";

import "./globals.css";

export const metadata: Metadata = {
	title: "devos.ing",
	description: "ADHD (Agentic Development Hub & Daemon) for agentic workflows.",
};

type Props = {
	children: ReactNode;
};

export default function RootLayout({ children }: Props): ReactElement {
	return (
		<html lang="en" suppressHydrationWarning>
			<body>
				<Script id="theme-init" strategy="beforeInteractive">
					{getThemeInitScript()}
				</Script>
				<AppProviders>{children}</AppProviders>
			</body>
		</html>
	);
}

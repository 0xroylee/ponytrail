import type { ReactElement, ReactNode } from "react";

import { WebOperatorShell } from "@/components/web-shell/web-operator-shell";

export default function OperatorLayout({
	children,
}: {
	children: ReactNode;
}): ReactElement {
	return <WebOperatorShell>{children}</WebOperatorShell>;
}

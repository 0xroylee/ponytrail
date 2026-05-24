"use client";

import {
	type ReactElement,
	type ReactNode,
	createContext,
	useContext,
} from "react";

import type { OperatorIssueActionsContextValue } from "./types/operator-issue-actions.types";

const OperatorIssueActionsContext =
	createContext<OperatorIssueActionsContextValue | null>(null);

export function OperatorIssueActionsProvider({
	children,
	value,
}: {
	children: ReactNode;
	value: OperatorIssueActionsContextValue;
}): ReactElement {
	return (
		<OperatorIssueActionsContext.Provider value={value}>
			{children}
		</OperatorIssueActionsContext.Provider>
	);
}

export function useOperatorIssueActions(): OperatorIssueActionsContextValue {
	const context = useContext(OperatorIssueActionsContext);
	if (!context) {
		throw new Error(
			"useOperatorIssueActions must be used within operator shell",
		);
	}
	return context;
}

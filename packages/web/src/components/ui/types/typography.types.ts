import type { ElementType, HTMLAttributes } from "react";

export type TypographyVariant =
	| "pageTitle"
	| "sectionTitle"
	| "cardTitle"
	| "dialogTitle"
	| "label"
	| "description"
	| "eyebrow"
	| "body"
	| "muted"
	| "metadata"
	| "tableHeader"
	| "tableCell"
	| "error"
	| "success"
	| "mono"
	| "srOnly";

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
	as?: ElementType;
	asChild?: boolean;
	colSpan?: number;
	dateTime?: string;
	htmlFor?: string;
	rowSpan?: number;
	scope?: string;
	variant?: TypographyVariant;
}

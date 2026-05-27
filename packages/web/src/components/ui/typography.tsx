"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as React from "react";

import type {
	TypographyProps,
	TypographyVariant,
} from "@/components/ui/types/typography.types";
import { cn } from "@/lib/utils";

const defaultElementByVariant: Record<TypographyVariant, React.ElementType> = {
	pageTitle: "h1",
	sectionTitle: "h3",
	cardTitle: "h3",
	dialogTitle: "h2",
	label: "span",
	description: "p",
	eyebrow: "p",
	body: "p",
	muted: "span",
	metadata: "span",
	tableHeader: "span",
	tableCell: "span",
	error: "p",
	success: "span",
	mono: "span",
	srOnly: "span",
};

const typographyVariants = cva("m-0", {
	variants: {
		variant: {
			pageTitle: "text-lg font-medium text-foreground",
			sectionTitle: "text-base text-foreground",
			cardTitle: "text-sm font-medium text-foreground",
			dialogTitle:
				"text-lg font-medium leading-none tracking-tight text-foreground",
			label: "text-sm font-medium leading-none text-foreground/80",
			description: "text-sm text-muted-foreground",
			eyebrow: "text-xs font-medium uppercase text-muted-foreground",
			body: "text-sm text-foreground/80",
			muted: "text-xs text-muted-foreground",
			metadata: "text-xs text-muted-foreground",
			tableHeader: "text-xs font-medium text-muted-foreground",
			tableCell: "text-sm text-foreground/80",
			error: "text-sm text-red-200",
			success: "text-sm text-emerald-700 dark:text-emerald-200/80",
			mono: "font-mono text-xs text-foreground/80",
			srOnly: "sr-only",
		},
	},
	defaultVariants: {
		variant: "body",
	},
});

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
	({ as, asChild = false, className, variant = "body", ...props }, ref) => {
		const Comp = asChild ? Slot : (as ?? defaultElementByVariant[variant]);
		return (
			<Comp
				className={cn(typographyVariants({ variant }), className)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Typography.displayName = "Typography";

export { Typography, typographyVariants };

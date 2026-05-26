"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const labelVariants = cva(
	"peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

const Label = React.forwardRef<
	React.ElementRef<typeof LabelPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
		VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
	<Typography
		asChild
		className={cn(labelVariants(), className)}
		variant="label"
	>
		<LabelPrimitive.Root ref={ref} {...props} />
	</Typography>
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };

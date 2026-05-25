"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		className={cn(
			"fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
			className,
		)}
		ref={ref}
		{...props}
	/>
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface SheetContentProps
	extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
	showCloseButton?: boolean;
}

const SheetContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	SheetContentProps
>(
	(
		{
			className,
			children,
			"aria-describedby": ariaDescribedBy,
			showCloseButton = true,
			...props
		},
		ref,
	) => (
		<SheetPortal>
			<SheetOverlay />
			<DialogPrimitive.Content
				aria-describedby={ariaDescribedBy}
				className={cn(
					"fixed inset-y-0 right-0 z-50 flex w-full max-w-[min(42rem,100vw)] flex-col border-l border-border bg-surface-inset text-zinc-100 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
					className,
				)}
				ref={ref}
				{...props}
			>
				{children}
				{showCloseButton ? (
					<DialogPrimitive.Close className="absolute right-4 top-4 rounded-md text-muted-foreground transition hover:bg-surface-active hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none">
						<X className="h-4 w-4" />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				) : null}
			</DialogPrimitive.Content>
		</SheetPortal>
	),
);
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("grid gap-1.5 text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetTitle = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		className={cn("text-lg font-semibold leading-none", className)}
		ref={ref}
		{...props}
	/>
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetOverlay,
	SheetPortal,
	SheetTitle,
	SheetTrigger,
};

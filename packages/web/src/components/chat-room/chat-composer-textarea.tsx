"use client";

import type { KeyboardEvent, ReactElement } from "react";

import { Textarea } from "@/components/ui/textarea";

interface ChatComposerTextareaProps {
	activeCommandId: string | undefined;
	className: string;
	disabled: boolean;
	draft: string;
	menuId: string;
	placeholder: string;
	showCommands: boolean;
	onBlur: () => void;
	onChange: (value: string) => void;
	onFocus: () => void;
	onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function ChatComposerTextarea({
	activeCommandId,
	className,
	disabled,
	draft,
	menuId,
	placeholder,
	showCommands,
	onBlur,
	onChange,
	onFocus,
	onKeyDown,
}: ChatComposerTextareaProps): ReactElement {
	return (
		<Textarea
			aria-activedescendant={showCommands ? activeCommandId : undefined}
			aria-controls={showCommands ? menuId : undefined}
			aria-expanded={showCommands}
			aria-haspopup="menu"
			className={className}
			disabled={disabled}
			onBlur={onBlur}
			onChange={(event) => onChange(event.target.value)}
			onFocus={onFocus}
			onKeyDown={onKeyDown}
			placeholder={placeholder}
			value={draft}
		/>
	);
}

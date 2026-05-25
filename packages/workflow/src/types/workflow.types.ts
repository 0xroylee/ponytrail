export interface WorkflowCommandSpec {
	command: string;
	args: string[];
}

export interface WorkflowPhraseSpec {
	text: string;
	agent: string;
	skill: string;
}

export interface GeneratedWorkflowMeta {
	title: string;
	description: string;
	phrases: WorkflowPhraseSpec[];
	agents: string[];
	skills: string[];
	precheck: WorkflowCommandSpec;
	check: WorkflowCommandSpec;
}

export interface WorkflowCommandResult {
	code: number;
	stdout?: string;
	stderr?: string;
}

export interface GeneratedWorkflowAgentInput {
	agent: string;
	skill: string;
	prompt: string;
	meta: GeneratedWorkflowMeta;
}

export interface GeneratedWorkflowContext {
	logger: Pick<Console, "error" | "info" | "warn">;
	commands: {
		run(
			command: string,
			args: string[],
			options?: { stage: "check" | "precheck" },
		): Promise<WorkflowCommandResult>;
	};
	agents: {
		run(input: GeneratedWorkflowAgentInput): Promise<unknown>;
	};
}

export type GeneratedWorkflowPhraseResult =
	| {
			phrase: WorkflowPhraseSpec;
			status: "fulfilled";
			result: unknown;
	  }
	| {
			phrase: WorkflowPhraseSpec;
			status: "rejected";
			error: string;
	  };

export interface GeneratedWorkflowRunResult {
	ok: boolean;
	precheck: WorkflowCommandResult;
	phraseResults: GeneratedWorkflowPhraseResult[];
	check?: WorkflowCommandResult;
}

export interface CreateDevosWorkflowPromptTextInput {
	message: string;
	defaultValue?: string;
}

export interface CreateDevosWorkflowPromptConfirmInput {
	message: string;
	defaultValue?: boolean;
}

export interface CreateDevosWorkflowPromptAdapter {
	text(input: CreateDevosWorkflowPromptTextInput): Promise<string>;
	confirm(input: CreateDevosWorkflowPromptConfirmInput): Promise<boolean>;
	close?(): void;
}

export interface CreateDevosWorkflowOptions {
	outputPath?: string;
	cwd?: string;
	force?: boolean;
	prompts?: CreateDevosWorkflowPromptAdapter;
}

export interface CreateDevosWorkflowResult {
	workflowPath: string;
	meta: GeneratedWorkflowMeta;
	files: string[];
}

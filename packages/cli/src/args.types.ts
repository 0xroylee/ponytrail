import type { RunOptions } from "./features/types";

export type CliParseOutput = {
	writeOut?: (message: string) => void;
	writeErr?: (message: string) => void;
};

export type RunCommanderOptions = {
	issue?: string;
	project?: string;
	allProjects?: boolean;
	poll?: boolean;
	pollForever?: boolean;
	exitWhenIdle?: boolean;
	concurrency?: number;
	pollIntervalMs?: number;
	maxPollCycles?: number;
	isolatedWorktrees?: boolean;
};

export type DaemonCommanderOptions = {
	cliOnly?: boolean;
	pollForever?: boolean;
	allProjects?: boolean;
};

export type OnboardCommanderOptions = {
	check?: boolean;
};

export type ProjectCommanderOptions = {
	project?: string;
};

export type StatusCommanderOptions = ProjectCommanderOptions & {
	issue?: string;
};

export type SkillAddCommanderOptions = ProjectCommanderOptions & {
	title: string;
	description: string;
	content: string;
};

export type SkillUpdateCommanderOptions = ProjectCommanderOptions & {
	title?: string;
	description?: string;
	content?: string;
};

export type TaskCreateCommanderOptions = ProjectCommanderOptions & {
	request?: string;
	nonInteractive?: boolean;
	maxClarificationRounds?: number;
	clarificationsJson?: Array<{ question: string; answer: string }>;
	json?: boolean;
};

export type SkillsCommand =
	| { action: "list"; projectId?: string }
	| {
			action: "add";
			projectId?: string;
			title: string;
			description: string;
			content: string;
	  }
	| {
			action: "update";
			projectId?: string;
			name: string;
			title?: string;
			description?: string;
			content?: string;
	  }
	| {
			action: "remove";
			projectId?: string;
			name: string;
	  };

export type TaskCommand = {
	action: "create";
	projectId?: string;
	request?: string;
	nonInteractive?: boolean;
	maxClarificationRounds?: number;
	clarificationAnswers?: Array<{ question: string; answer: string }>;
	json?: boolean;
};

export type CliCommand =
	| { kind: "run"; options: RunOptions }
	| {
			kind: "daemon";
			cliOnly?: boolean;
			pollForever?: boolean;
			allProjects?: boolean;
	  }
	| { kind: "status"; issueKey: string; projectId: string }
	| { kind: "projects" }
	| { kind: "skills"; command: SkillsCommand }
	| { kind: "task"; command: TaskCommand }
	| { kind: "onboard"; check: boolean }
	| { kind: "help" };

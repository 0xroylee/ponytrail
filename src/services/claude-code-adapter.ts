import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AgentAdapter, AgentResult } from "../core/agent-adapter";
import type { ResolvedProjectConfig } from "../core/types";
import { assertCommandOk, runCommand } from "../utils/shell";

export class ClaudeCodeAdapter implements AgentAdapter {
	constructor(private config: ResolvedProjectConfig) {}

	async runPlan(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt);
	}

	async resume(_sessionId: string, prompt: string): Promise<AgentResult> {
		return this.runClaudeContinue(prompt);
	}

	async runReview(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt);
	}

	private async runClaude(prompt: string): Promise<AgentResult> {
		const outputFile = await this.nextOutputFile();
		const args = [
			"-p",
			prompt,
			"--output-format",
			"json",
			"--output-file",
			outputFile,
		];

		const result = await runCommand("claude", args, {
			cwd: this.config.executionPath,
			streamStdout: this.config.codex.streamLogs,
			streamStderr: this.config.codex.streamLogs,
			stdinMode: "ignore",
		});

		assertCommandOk("claude", args, result);
		const finalMessage = await readOutputFile(outputFile);
		const sessionId = extractSessionId(result.stdout);
		const usage = extractUsage(result.stdout);

		return {
			sessionId,
			finalMessage,
			stdout: result.stdout,
			usage,
		};
	}

	private async runClaudeContinue(prompt: string): Promise<AgentResult> {
		const outputFile = await this.nextOutputFile();
		const args = [
			"--continue",
			prompt,
			"--output-format",
			"json",
			"--output-file",
			outputFile,
		];

		const result = await runCommand("claude", args, {
			cwd: this.config.executionPath,
			streamStdout: this.config.codex.streamLogs,
			streamStderr: this.config.codex.streamLogs,
			stdinMode: "ignore",
		});

		assertCommandOk("claude", args, result);
		const finalMessage = await readOutputFile(outputFile);
		const sessionId = extractSessionId(result.stdout);
		const usage = extractUsage(result.stdout);

		return {
			sessionId,
			finalMessage,
			stdout: result.stdout,
			usage,
		};
	}

	private async nextOutputFile(): Promise<string> {
		const dir = path.join(this.config.workspacePath, ".piv-loop", "tmp");
		await mkdir(dir, { recursive: true });
		return path.join(
			dir,
			`claude-output-${Date.now()}-${Math.floor(Math.random() * 10000)}.txt`,
		);
	}
}

async function readOutputFile(file: string): Promise<string> {
	try {
		return (await readFile(file, "utf8")).trim();
	} catch {
		return "";
	}
}

function extractSessionId(jsonOutput: string): string | undefined {
	try {
		const parsed = JSON.parse(jsonOutput) as Record<string, unknown>;
		const id =
			parsed.session_id ??
			parsed.sessionId ??
			parsed.conversation_id ??
			parsed.conversationId;
		if (typeof id === "string") {
			return id;
		}
	} catch {}
	return undefined;
}

function extractUsage(jsonOutput: string): AgentResult["usage"] | undefined {
	try {
		const parsed = JSON.parse(jsonOutput) as Record<string, unknown>;
		const usage = parsed.usage as Record<string, unknown> | undefined;
		if (!usage) {
			return undefined;
		}
		return {
			inputTokens:
				typeof usage.input_tokens === "number" ? usage.input_tokens : undefined,
			outputTokens:
				typeof usage.output_tokens === "number"
					? usage.output_tokens
					: undefined,
			totalTokens:
				typeof usage.total_tokens === "number" ? usage.total_tokens : undefined,
		};
	} catch {}
	return undefined;
}

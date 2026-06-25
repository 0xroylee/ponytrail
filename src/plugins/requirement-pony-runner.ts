import { z } from "zod";
import { VoteValueSchema } from "../runtimes/ponytrail/manifest";
import type {
  RequirementPonyResponse,
  RequirementPonyRunInput,
  RequirementPonyRunner,
} from "../runtimes/ponytrail/requirement-court";
import type { CliStreamEvent, CliStreamRunner, WorkerCliAdapter } from "./adapters/types";

export interface CliRequirementPonyRunnerOptions {
  adapter: WorkerCliAdapter;
  streamRunner: CliStreamRunner;
  writeStdout?: ((chunk: string) => void) | undefined;
  writeStderr?: ((chunk: string) => void) | undefined;
}

const CliRequirementPonyResponseSchema = z.object({
  message: z.string().min(1),
  visibleThinking: z.object({
    focus: z.string().min(1),
    concern: z.string().min(1),
    recommendation: z.string().min(1),
  }),
  evidence: z.array(z.string().min(1)).min(1),
  vote: VoteValueSchema,
  confidence: z.number().min(0).max(1),
  requiredChanges: z.array(z.string().min(1)),
});

export function createCliRequirementPonyRunner(
  options: CliRequirementPonyRunnerOptions,
): RequirementPonyRunner {
  return async (input) => {
    const result = await collectStreamingPonyResult(
      options.adapter.streamGoal(buildRequirementPonyPrompt(input), options.streamRunner),
      options,
    );

    if (result.exitCode !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim() || "no output";
      throw new Error(
        `Requirement pony ${input.bot.id} failed through ${options.adapter.id}: ${detail}`,
      );
    }

    return parseRequirementPonyResponse(result.stdout);
  };
}

interface StreamingPonyResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function collectStreamingPonyResult(
  events: AsyncIterable<CliStreamEvent>,
  options: CliRequirementPonyRunnerOptions,
): Promise<StreamingPonyResult> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writeStdout = options.writeStdout ?? ((chunk: string) => process.stdout.write(chunk));
  const writeStderr = options.writeStderr ?? ((chunk: string) => process.stderr.write(chunk));
  let exitCode: number | undefined;

  for await (const event of events) {
    if (event.type === "stdout") {
      stdout.push(event.chunk);
      writeStdout(event.chunk);
      continue;
    }

    if (event.type === "stderr") {
      stderr.push(event.chunk);
      writeStderr(event.chunk);
      continue;
    }

    if (event.type === "exit") {
      exitCode = event.exitCode;
    }
  }

  if (exitCode === undefined) {
    throw new Error("Requirement pony stream ended before the subprocess exit event.");
  }

  return {
    exitCode,
    stdout: stdout.join(""),
    stderr: stderr.join(""),
  };
}

function buildRequirementPonyPrompt(input: RequirementPonyRunInput): string {
  const approvalConditions = formatList(input.bot.approvalConditions ?? []);
  const rejectOrAmendConditions = formatList(input.bot.rejectOrAmendConditions ?? []);
  const skillDescriptions = formatSkillDescriptions(input);
  const priorDiscussion =
    input.priorDiscussion.length === 0
      ? "none"
      : input.priorDiscussion
          .map((entry) => `- Round ${entry.round} ${entry.botId} (${entry.vote}): ${entry.message}`)
          .join("\n");

  return [
    "Requirement pony review",
    `Pony: ${input.bot.displayName} (${input.bot.id})`,
    `Model: ${input.model.name} (${input.model.id})`,
    `Round: ${input.round} of ${input.manifest.deliberation.maxRounds}`,
    `Instruction: ${input.bot.instruction}`,
    `Pony skills:\n${skillDescriptions}`,
    `Approval conditions:\n${approvalConditions}`,
    `Reject or amend conditions:\n${rejectOrAmendConditions}`,
    "Requirement:",
    `Title: ${input.contract.title}`,
    `Intent: ${input.contract.intent}`,
    `Include: ${formatInlineList(input.contract.scope.include)}`,
    `Exclude: ${formatInlineList(input.contract.scope.exclude)}`,
    `Acceptance criteria: ${formatInlineList(input.contract.acceptanceCriteria)}`,
    `Evidence required: ${formatInlineList(input.contract.evidenceRequired)}`,
    `Risks: ${formatInlineList(input.contract.risks)}`,
    `Open questions: ${formatInlineList(input.contract.openQuestions)}`,
    `Prior discussion:\n${priorDiscussion}`,
    "Research contract:",
    "- Use the pony skills above as review lenses before voting.",
    "- Cite concrete evidence from the requirement, manifest skills, prior discussion, repo/tool context you inspected, or a named unknown.",
    "- Do not approve without at least one concrete evidence item.",
    "- Vote amend when the evidence is missing, unverifiable, or too thin for your role.",
    "Do not reveal private chain-of-thought. Summarize only visible rationale.",
    'Return only JSON: {"message": string, "visibleThinking": {"focus": string, "concern": string, "recommendation": string}, "evidence": string[], "vote": "approve" | "amend" | "reject", "confidence": number, "requiredChanges": string[]}',
  ].join("\n");
}

function parseRequirementPonyResponse(rawOutput: string): RequirementPonyResponse {
  const jsonText = extractJsonObject(rawOutput);
  const parsed = CliRequirementPonyResponseSchema.parse(JSON.parse(jsonText));

  return {
    message: parsed.message,
    visibleThinking: parsed.visibleThinking,
    evidence: parsed.evidence,
    vote: parsed.vote,
    confidence: parsed.confidence,
    requiredChanges: parsed.requiredChanges,
  };
}

function formatSkillDescriptions(input: RequirementPonyRunInput): string {
  if (input.bot.skills.length === 0) {
    return "- none";
  }

  return input.bot.skills
    .map((skillId) => {
      const skill = input.manifest.skills[skillId];
      const description = skill?.description ?? "No manifest description configured.";
      return `- ${skillId}: ${description}`;
    })
    .join("\n");
}

function extractJsonObject(rawOutput: string): string {
  const trimmed = rawOutput.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Requirement pony did not return a JSON object.");
  }

  return trimmed.slice(start, end + 1);
}

function formatList(values: string[]): string {
  if (values.length === 0) {
    return "- none";
  }

  return values.map((value) => `- ${value}`).join("\n");
}

function formatInlineList(values: string[]): string {
  return values.length > 0 ? values.join("; ") : "none";
}

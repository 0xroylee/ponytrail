import { isAbsolute, join, relative } from "node:path";
import type { DetailedRequirement, RequirementCourtResult } from "./requirement-court";

export interface RequirementCourtTextReportOptions {
  discussionHeading?: string | undefined;
  includeVisibleThinking?: boolean | undefined;
  markdownReportPath?: string | undefined;
  style?: RequirementCourtTextReportStyle | undefined;
}

export interface RequirementCourtTextReportStyle {
  heading?: (value: string) => string;
}

export function renderRequirementCourtTextReport(
  result: RequirementCourtResult,
  options: RequirementCourtTextReportOptions = {},
): string[] {
  const style = options.style ?? {};
  const lines: string[] = [
    formatHeading(options.discussionHeading ?? "Requirement discussion", style),
  ];

  for (const round of result.rounds) {
    lines.push("", formatHeading(`Round ${round.round}`, style));
    for (const entry of round.discussion) {
      lines.push(entry.line);
    }
  }

  if (options.includeVisibleThinking) {
    pushVisibleThinkingTranscript(lines, result, style);
  }

  lines.push("", formatHeading("Judge summary", style), result.judge.summary);
  if (options.markdownReportPath) {
    lines.push(`Markdown report: ${options.markdownReportPath}`);
  }

  lines.push("", formatHeading("Final votes", style));
  for (const vote of result.votes) {
    lines.push(`${vote.botId}: ${vote.vote} (${vote.confidence})`);
  }

  lines.push(
    "",
    formatHeading("Detailed requirement", style),
    `Title: ${result.detailedRequirement.title}`,
    `Intent: ${result.detailedRequirement.intent}`,
  );
  pushList(lines, "What will change", getDetailedRequirementChanges(result.detailedRequirement));
  pushList(lines, "What will not change", result.detailedRequirement.exclude);
  pushList(lines, "Acceptance criteria", result.detailedRequirement.acceptanceCriteria);
  pushList(lines, "Evidence required", result.detailedRequirement.evidenceRequired);
  pushList(lines, "Risks", result.detailedRequirement.risks);
  pushList(lines, "Open questions", result.detailedRequirement.openQuestions);
  lines.push(`Human confirmation: ${result.humanConfirmation}`);

  return lines;
}

export function getDetailedRequirementChanges(detailedRequirement: DetailedRequirement): string[] {
  return detailedRequirement.include.length > 0
    ? detailedRequirement.include
    : [detailedRequirement.intent];
}

export function createRequirementCourtMarkdownReportPath(
  rootDir: string,
  result: RequirementCourtResult,
  timestamp: Date = new Date(),
): string {
  const timestampSlug = timestamp
    .toISOString()
    .replace(/\.\d{3}Z$/u, "Z")
    .replace(/[:]/gu, "-");

  return join(
    rootDir,
    ".ponyrace",
    "ponyrace",
    `${timestampSlug}-${slugifyRequirementCourtReportTitle(result.detailedRequirement.title)}.md`,
  );
}

export function formatRequirementCourtReportPathForOutput(
  rootDir: string,
  reportPath: string,
): string {
  const relativePath = relative(rootDir, reportPath);
  if (relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath)) {
    return relativePath;
  }

  return reportPath;
}

function pushVisibleThinkingTranscript(
  lines: string[],
  result: RequirementCourtResult,
  style: RequirementCourtTextReportStyle,
): void {
  lines.push("", formatHeading("Visible thinking transcript", style));
  for (const round of result.rounds) {
    lines.push(`Round ${round.round}`);
    for (const entry of round.discussion) {
      lines.push(
        `${entry.displayName} (${entry.botId})`,
        `Focus: ${entry.visibleThinking.focus}`,
        `Concern: ${entry.visibleThinking.concern}`,
        `Recommendation: ${entry.visibleThinking.recommendation}`,
        `Vote: ${entry.vote} (${Math.round(entry.confidence * 100)}% confidence)`,
      );
      pushList(lines, "Evidence", entry.evidence);
      pushList(lines, "Required changes", entry.requiredChanges);
    }
  }
}

function pushList(lines: string[], label: string, values: string[]): void {
  if (values.length === 0) {
    return;
  }

  lines.push(`${label}:`);
  for (const value of values) {
    lines.push(`- ${value}`);
  }
}

function formatHeading(value: string, style: RequirementCourtTextReportStyle): string {
  return style.heading ? style.heading(value) : value;
}

function slugifyRequirementCourtReportTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);

  return slug || "requirement-discussion";
}

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createLocalRequirementPonyRunner } from "../src/plugins";
import { draftGoalContract } from "../src/runtimes/ponytrail/goal";
import { createDefaultManifest } from "../src/runtimes/ponytrail/manifest";
import { runRequirementCourt } from "../src/runtimes/ponytrail/requirement-court";
import {
  createRequirementCourtMarkdownReportPath,
  formatRequirementCourtReportPathForOutput,
  renderRequirementCourtTextReport,
} from "../src/runtimes/ponytrail/requirement-report";

describe("requirement court reporting", () => {
  test("renders the user-facing court report in CLI order", async () => {
    const result = await createCourtResult();

    const lines = renderRequirementCourtTextReport(result, {
      discussionHeading: "Pony race",
      includeVisibleThinking: true,
      markdownReportPath: ".ponyrace/ponyrace/report.md",
    });

    const orderedSections = [
      "Pony race",
      "Round 1",
      "Visible thinking transcript",
      "Judge summary",
      "Markdown report: .ponyrace/ponyrace/report.md",
      "Final votes",
      "Detailed requirement",
      "Human confirmation: pending",
    ].map((section) => lines.findIndex((line) => line.includes(section)));

    expect(orderedSections.every((index) => index >= 0)).toBe(true);
    expect(orderedSections).toEqual([...orderedSections].sort((left, right) => left - right));
    expect(lines).toContain("What will change:");
    expect(lines).toContain("- Add CSV import to admin dashboard");
  });

  test("keeps report path creation deterministic and relative to the workspace when possible", async () => {
    const result = await createCourtResult();
    const rootDir = "/tmp/ponytrail-workspace";
    const reportPath = createRequirementCourtMarkdownReportPath(
      rootDir,
      result,
      new Date("2026-06-25T09:30:00Z"),
    );

    expect(reportPath).toBe(
      join(
        rootDir,
        ".ponyrace",
        "ponyrace",
        "2026-06-25T09-30-00Z-add-csv-import-to-admin-dashboard.md",
      ),
    );
    expect(formatRequirementCourtReportPathForOutput(rootDir, reportPath)).toBe(
      ".ponyrace/ponyrace/2026-06-25T09-30-00Z-add-csv-import-to-admin-dashboard.md",
    );
    expect(formatRequirementCourtReportPathForOutput(rootDir, "/tmp/outside-report.md")).toBe(
      "/tmp/outside-report.md",
    );
  });
});

async function createCourtResult() {
  const manifest = createDefaultManifest();
  const contract = draftGoalContract("Add CSV import to admin dashboard", { manifest });

  return runRequirementCourt(contract, {
    manifest,
    ponyRunner: createLocalRequirementPonyRunner(),
  });
}

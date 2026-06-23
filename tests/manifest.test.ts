import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  calculateDefaultSetupRequiredApprovals,
  createDefaultManifest,
  createDefaultSetupReviewBots,
  createSetupManifest,
  loadManifest,
  ManifestSchema,
  writeManifest,
} from "../src/runtimes/ponytrail/manifest";

describe("manifest", () => {
  test("creates a default 4-bot requirement court with a non-voting Judge", () => {
    const manifest = createDefaultManifest();
    const parsed = ManifestSchema.parse(manifest);

    expect(parsed.kind).toBe("ai-work-runtime.ponytrail");
    expect(parsed.deliberation.decisionRule.voters).toBe(4);
    expect(parsed.deliberation.decisionRule.requiredApprovals).toBe(3);
    expect(parsed.deliberation.decisionRule.voterIds).toEqual([
      "product_manager_bot",
      "project_manager_bot",
      "engineer_bot",
      "testing_bot",
    ]);
    expect(parsed.bots.map((bot) => bot.id)).toEqual([
      "requirements_brainstorm_bot",
      "goal_draft_bot",
      "product_manager_bot",
      "project_manager_bot",
      "engineer_bot",
      "testing_bot",
      "requirement_judge_bot",
    ]);
    expect(parsed.models.map((model) => model.id)).toEqual([
      "requirements_model",
      "draft_model",
      "product_manager_model",
      "project_manager_model",
      "engineer_model",
      "testing_model",
      "judge_model",
    ]);
    expect(parsed.bots.map((bot) => [bot.id, bot.model])).toEqual([
      ["requirements_brainstorm_bot", "requirements_model"],
      ["goal_draft_bot", "draft_model"],
      ["product_manager_bot", "product_manager_model"],
      ["project_manager_bot", "project_manager_model"],
      ["engineer_bot", "engineer_model"],
      ["testing_bot", "testing_model"],
      ["requirement_judge_bot", "judge_model"],
    ]);
    expect(parsed.bots.find((bot) => bot.id === "requirement_judge_bot")?.type).toBe("judge_bot");
  });

  test("rejects bots that reference a missing model", () => {
    const manifest = createDefaultManifest();

    expect(() =>
      ManifestSchema.parse({
        ...manifest,
        bots: manifest.bots.map((bot) =>
          bot.id === "product_manager_bot" ? { ...bot, model: "missing_model" } : bot,
        ),
      }),
    ).toThrow();
  });

  test("writes and loads a manifest from disk", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "ponytrail-manifest-"));
    const manifestPath = join(rootDir, "manifest.json");

    try {
      const manifest = createDefaultManifest({ name: "Custom Court" });

      await writeManifest(manifestPath, manifest);
      const loaded = await loadManifest(manifestPath);

      expect(loaded.metadata.name).toBe("Custom Court");
      expect(loaded.runtime.workerAgents.map((agent) => agent.id)).toEqual(["codex", "claude"]);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("loads legacy manifests that do not have a model registry yet", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "ponytrail-manifest-"));
    const manifestPath = join(rootDir, "manifest.json");

    try {
      const currentManifest = createDefaultManifest({ name: "Legacy Court" });
      const { models: _models, ...legacyManifest } = currentManifest;

      await writeFile(
        manifestPath,
        `${JSON.stringify(
          {
            ...legacyManifest,
            bots: legacyManifest.bots.map((bot) => ({ ...bot, model: "default_model" })),
          },
          null,
          2,
        )}\n`,
      );

      const loaded = await loadManifest(manifestPath);

      expect(loaded.metadata.name).toBe("Legacy Court");
      expect(loaded.models.map((model) => model.id)).toEqual([
        "requirements_model",
        "draft_model",
        "product_manager_model",
        "project_manager_model",
        "engineer_model",
        "testing_model",
        "judge_model",
      ]);
      expect(loaded.bots.map((bot) => [bot.id, bot.model])).toEqual([
        ["requirements_brainstorm_bot", "requirements_model"],
        ["goal_draft_bot", "draft_model"],
        ["product_manager_bot", "product_manager_model"],
        ["project_manager_bot", "project_manager_model"],
        ["engineer_bot", "engineer_model"],
        ["testing_bot", "testing_model"],
        ["requirement_judge_bot", "judge_model"],
      ]);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});

describe("setup manifest", () => {
  test("calculates the default over-60-percent approval threshold", () => {
    expect(calculateDefaultSetupRequiredApprovals(3)).toBe(2);
    expect(calculateDefaultSetupRequiredApprovals(4)).toBe(3);
    expect(calculateDefaultSetupRequiredApprovals(5)).toBe(4);
  });

  test("creates the standard setup bot roster with a 3 of 4 decision rule", () => {
    const manifest = ManifestSchema.parse(createSetupManifest({ name: "Setup Court" }));

    expect(manifest.metadata.name).toBe("Setup Court");
    expect(manifest.deliberation.decisionRule.voters).toBe(4);
    expect(manifest.deliberation.decisionRule.requiredApprovals).toBe(3);
    expect(manifest.deliberation.decisionRule.voterIds).toEqual([
      "product_manager_bot",
      "project_manager_bot",
      "senior_engineer_bot",
      "testing_bot",
    ]);
    expect(manifest.defaultGoalTemplate.approvalRule.goalDirectionPanel).toEqual({
      requiredApprovals: 3,
      voters: ["product_manager_bot", "project_manager_bot", "senior_engineer_bot", "testing_bot"],
    });
    expect(manifest.bots.map((bot) => bot.id)).toEqual([
      "requirements_brainstorm_bot",
      "goal_draft_bot",
      "product_manager_bot",
      "project_manager_bot",
      "senior_engineer_bot",
      "testing_bot",
      "requirement_judge_bot",
    ]);
  });

  test("creates a custom setup roster and derives a 4 of 5 decision rule", () => {
    const reviewBots = [
      ...createDefaultSetupReviewBots(),
      {
        id: "security_bot",
        displayName: "Security Bot",
        role: "Security",
        panel: "requirement_court",
        instruction: "Review data, permission, and security risk before voting.",
        modelId: "security_model",
        modelName: "security-review-model",
        votes: true,
      },
    ];

    const manifest = ManifestSchema.parse(
      createSetupManifest({
        name: "Security Court",
        reviewBots,
      }),
    );
    const securityBot = manifest.bots.find((bot) => bot.id === "security_bot");
    const judgeBot = manifest.bots.find((bot) => bot.id === "requirement_judge_bot");

    expect(manifest.deliberation.decisionRule.voters).toBe(5);
    expect(manifest.deliberation.decisionRule.requiredApprovals).toBe(4);
    expect(manifest.deliberation.decisionRule.voterIds).toContain("security_bot");
    expect(manifest.workerExecutionGate.mayStartWhen).toContain("requirement_court.approvals >= 4");
    expect(manifest.models.some((model) => model.id === "security_model")).toBe(true);
    expect(manifest.bots.some((bot) => bot.id === "security_bot")).toBe(true);
    expect(securityBot?.model).toBe("security_model");
    expect(judgeBot?.instruction).toContain("4-of-5 approval rule");
    expect(judgeBot?.instruction).not.toContain("3-of-4");
  });

  test("preserves custom model names for existing setup model ids", () => {
    const reviewBots = createDefaultSetupReviewBots().map((bot) =>
      bot.id === "product_manager_bot" ? { ...bot, modelName: "custom-product-review-model" } : bot,
    );

    const manifest = ManifestSchema.parse(
      createSetupManifest({
        name: "Custom Model Names",
        reviewBots,
      }),
    );

    expect(
      manifest.models.some(
        (model) =>
          model.id === "product_manager_model" && model.name === "custom-product-review-model",
      ),
    ).toBe(true);
  });

  test("rejects duplicate setup bot ids before manifest construction", () => {
    const reviewBots = createDefaultSetupReviewBots();
    const productBot = reviewBots.find((bot) => bot.id === "product_manager_bot");

    if (!productBot) {
      throw new Error("Missing default product manager setup bot.");
    }

    expect(() =>
      createSetupManifest({
        name: "Duplicate Court",
        reviewBots: [
          ...reviewBots,
          {
            ...productBot,
            displayName: "Duplicate Product Manager Bot",
          },
        ],
      }),
    ).toThrow("Duplicate setup bot id: product_manager_bot");
  });

  test("rejects setup bot ids reserved for built-in bots", () => {
    expect(() =>
      createSetupManifest({
        name: "Reserved Id Court",
        reviewBots: [
          ...createDefaultSetupReviewBots(),
          {
            id: "goal_draft_bot",
            displayName: "Draft Collision Bot",
            role: "Draft Collision",
            panel: "requirement_court",
            instruction: "This setup review bot id collides with a built-in drafting bot.",
            modelId: "draft_collision_model",
            modelName: "draft-collision-review-model",
            votes: true,
          },
        ],
      }),
    ).toThrow("Setup bot id is reserved: goal_draft_bot");
  });

  test("rejects setup manifests without voting bots", () => {
    expect(() =>
      createSetupManifest({
        name: "No Voters",
        reviewBots: createDefaultSetupReviewBots().map((bot) => ({ ...bot, votes: false })),
      }),
    ).toThrow("At least one voting setup bot is required.");
  });

  test("rejects custom approval counts outside the voter range", () => {
    expect(() =>
      createSetupManifest({
        name: "Too Many Required",
        requiredApprovals: 5,
      }),
    ).toThrow("Required approvals must be between 1 and 4.");
  });

  test("rejects missing setup model fields and below-range approval counts", () => {
    expect(() =>
      createSetupManifest({
        name: "Missing Model Id",
        reviewBots: createDefaultSetupReviewBots().map((bot) =>
          bot.id === "product_manager_bot" ? { ...bot, modelId: "" } : bot,
        ),
      }),
    ).toThrow("Bot product_manager_bot must reference a model id.");

    expect(() =>
      createSetupManifest({
        name: "Missing Model Name",
        reviewBots: createDefaultSetupReviewBots().map((bot) =>
          bot.id === "product_manager_bot" ? { ...bot, modelName: "" } : bot,
        ),
      }),
    ).toThrow("Bot product_manager_bot must reference a model name.");

    expect(() =>
      createSetupManifest({
        name: "Too Few Required",
        requiredApprovals: 0,
      }),
    ).toThrow("Required approvals must be between 1 and 4.");

    expect(() =>
      createSetupManifest({
        name: "Fractional Required",
        requiredApprovals: 1.5,
      }),
    ).toThrow("Required approvals must be between 1 and 4.");
  });
});

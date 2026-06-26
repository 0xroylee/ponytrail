#!/usr/bin/env bun
/**
 * Demo script — runs the court animation end-to-end with fake bots.
 * Usage:  bun scripts/demo-animation.ts
 */
import { createCourtAnimator, printHorseRaceHeader, printRaceTrack } from "../src/court-animation";
import type { Manifest } from "../src/runtimes/ponytrail/manifest";
import type { RequirementCourtRound } from "../src/runtimes/ponytrail/requirement-court";

const manifest = {
  manifestVersion: "0.1",
  kind: "ai-work-runtime.ponytrail",
  metadata: { name: "demo", description: "", owner: "human" },
  runtime: { mode: "requirement_first", defaultLanguage: "en", workerAgents: [] },
  models: [{ id: "m1", provider: "demo", name: "demo-model" }],
  bots: [
    {
      id: "product_manager_bot",
      displayName: "PM Bot",
      role: "Product Manager",
      panel: "requirement_court",
      model: "m1",
      instruction: "",
      votes: true,
    },
    {
      id: "engineer_bot",
      displayName: "Engineer",
      role: "Engineer",
      panel: "requirement_court",
      model: "m1",
      instruction: "",
      votes: true,
    },
    {
      id: "testing_bot",
      displayName: "Testing",
      role: "QA",
      panel: "requirement_court",
      model: "m1",
      instruction: "",
      votes: true,
    },
    {
      id: "senior_engineer_bot",
      displayName: "Sr Engineer",
      role: "Senior Engineer",
      panel: "requirement_court",
      model: "m1",
      instruction: "",
      votes: true,
    },
  ],
  deliberation: {
    maxRounds: 1,
    decisionRule: {
      voterIds: ["product_manager_bot", "engineer_bot", "testing_bot", "senior_engineer_bot"],
      voters: 4,
      requiredApprovals: 3,
    },
  },
} as unknown as Manifest;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const votes: Array<{ botId: string; displayName: string; vote: string }> = [
  { botId: "product_manager_bot", displayName: "PM Bot", vote: "approve" },
  { botId: "engineer_bot", displayName: "Engineer", vote: "amend" },
  { botId: "testing_bot", displayName: "Testing", vote: "approve" },
  { botId: "senior_engineer_bot", displayName: "Sr Engineer", vote: "approve" },
];

const animator = createCourtAnimator(manifest, {
  minPonyMs: 1800, // show each pony for at least 1.8s
  frameMs: 160, // gallop frame speed
});

await animator.onRoundStart(1, manifest.deliberation.decisionRule.voterIds);

const discussion: RequirementCourtRound["discussion"] = [];

for (const { botId, displayName, vote } of votes) {
  await animator.onPonyStart(botId, displayName, 1);
  // Simulate the bot "thinking" — just wait, the interval does the animation.
  await sleep(2200);
  const entry = {
    botId,
    displayName,
    role: botId,
    round: 1,
    message: "deliberated",
    visibleThinking: { focus: "", concern: "", recommendation: "" },
    line: `${botId}: ${vote}`,
    vote,
    confidence: 0.9,
    requiredChanges: vote === "amend" ? ["clarify scope"] : [],
  } as RequirementCourtRound["discussion"][number];
  discussion.push(entry);
  await animator.onPonyComplete(entry);
}

const round: RequirementCourtRound = {
  round: 1,
  discussion,
  votes: [],
  verdict: {
    approved: true,
    approvals: 3,
    amendments: 1,
    rejections: 0,
    missingVoters: [],
    requiredChanges: [],
  },
};

await animator.onRoundComplete(round);
animator.stop();

// Print full header first so you can see the starting lineup.
console.log("\n--- Replay: starting lineup ---\n");
printHorseRaceHeader(manifest);

console.log("\n--- Replay: race track ---\n");
printRaceTrack([round], manifest);

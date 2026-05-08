---
name: strategy-confidence-test
description: Pressure-test proposed strategies, implementation plans, test plans, risk assessments, or architectural approaches by searching for loopholes, invalid assumptions, missing evidence, and edge cases. Use when the user asks whether a strategy is sound, wants "100% confidence", asks to find all possible loopholes, requests adversarial validation, or wants fixes iterated until the strategy is factually defensible.
---

# Strategy Confidence Test

## Purpose

Use this skill to turn a strategy into a defensible strategy. Treat "100% confidence" as a verification target, not a claim to make casually: continue until no material loopholes remain, then state the evidence, residual assumptions, and exact confidence limit.

## Core Loop

1. Restate the strategy in precise terms.
2. List the facts, assumptions, constraints, dependencies, and success criteria.
3. Challenge each item adversarially:
   - What would make this false?
   - What input, environment, user behavior, timing, permission, or integration could break it?
   - What is unstated, ambiguous, or outside the agent's control?
   - What evidence is missing or stale?
4. Classify each loophole:
   - `blocker`: makes the strategy invalid or unsafe.
   - `major`: likely to cause failure, rework, or hidden risk.
   - `minor`: worth fixing, but does not invalidate the strategy.
   - `residual`: cannot be fully eliminated with available access or time.
5. Propose a concrete fix for every non-residual loophole.
6. Revise the strategy with those fixes.
7. Re-run the challenge loop against the revised strategy.
8. Stop only when another pass finds no blocker, major, or minor loopholes.

## Evidence Rules

- Verify claims against available source material, code, tests, docs, specs, logs, or primary sources.
- Browse or use current external sources when facts may have changed or when the user asks for latest/current truth.
- Do not claim literal certainty for unknowable future behavior, third-party systems, hidden requirements, or unobserved production conditions.
- If evidence cannot be obtained, mark the point as a residual assumption and explain what would close it.
- Prefer tests, executable checks, typechecks, static analysis, or reproducible commands over verbal confidence.

## Output

Keep the answer direct and decision-oriented:

```text
CONFIDENCE: 100% within stated evidence / NOT 100%
SUMMARY: <one paragraph>

FINAL STRATEGY:
<revised strategy>

LOOP RESULTS:
- pass <n>: <loopholes found and fixes applied>

RESIDUAL ASSUMPTIONS:
- <assumption, why it remains, what would verify it>

VERIFICATION:
- <checks run, sources read, or evidence used>
```

If the strategy is not yet defensible, return `CONFIDENCE: NOT 100%` and keep iterating if the task context allows more work.

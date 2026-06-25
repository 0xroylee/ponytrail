---
name: ponyrace
description: Use when the user invokes /ponyrace, asks to run a pony race, wants role ponies to discuss whether a requirement direction matches their request, or wants Ponyrace's CLI requirement discussion before implementation.
---

# Ponyrace

## Overview

Run Superpowers brainstorming first, then run Ponyrace's CLI requirement discussion before implementation. The skill makes `/ponyrace ...` a chat trigger for an approved, refined requirement: `superpowers:brainstorming` owns redefining the task requirement with the human, and the `ponyrace ponyrace` CLI remains the source of truth for role-pony discussion, vote tallying, Judge summary, and human confirmation.

Core principle: the human approves the refined requirement before Ponyrace discussion starts, and then separately confirms the Ponytrail requirement direction after the court reports. Superpowers approval is not worker execution approval.

## Flow

1. Extract the requirement text after `/ponyrace`; if the request text is missing, ask the user for the requirement in one concise question.
2. Invoke `superpowers:brainstorming` with the extracted requirement before running the Ponyrace CLI.
3. If `superpowers:brainstorming` is unavailable, stop and tell the user to run `ponyrace skills install superpowers:brainstorming --agents codex,claude,cursor --home ~`, restart their agent IDE, and retry `/ponyrace`.
4. Follow the Superpowers brainstorming workflow until the human approves the refined requirement. If the workflow needs more human input or has not reached approval, keep working in that workflow and do not run Ponyrace yet.
5. Run the Ponyrace CLI discussion with `ponyrace ponyrace "<approved refined requirement>"`.
6. If the user gives a manifest path, pass it with `--manifest <path>` instead of appending it to the requirement text.
7. If the user asks for deep research, evidence-backed ponies, or less shallow thinking, add `--research`. If they name a worker, pass it with `--worker <id>`; otherwise use the manifest default worker.
8. Preserve the important CLI output when reporting back:
   - pony discussion lines
   - visible thinking transcript
   - evidence lines, when present
   - Judge summary
   - approval tally
   - detailed requirement
   - `Human confirmation: pending`
9. Stop after the discussion and ask for explicit human approval before implementation.

## Guardrails

- Do not run the Ponyrace CLI before `superpowers:brainstorming` reaches human approval for the refined requirement.
- Do not reimplement Superpowers brainstorming in this skill.
- Do not reimplement voting in the skill.
- Do not bypass the CLI requirement discussion.
- Do not start worker implementation from this skill.
- Do not treat Superpowers approval, 3-of-4 court approval, or any bot vote as human approval to execute; the human owner must still confirm after Ponyrace reports.
- Do not call `--research` a guarantee of correctness; it means each pony must run through the selected worker CLI and return visible evidence before approval.
- If `ponyrace` is unavailable and this is not the local Ponyrace repo, say the CLI is unavailable and ask the user how they want to run it.

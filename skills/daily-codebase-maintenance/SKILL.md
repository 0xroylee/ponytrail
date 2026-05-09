---
name: daily-codebase-maintenance
description: Project-agnostic maintenance skill for recurring backend TypeScript cleanup, structure hygiene, and reliability improvements.
---

# Daily Codebase Maintenance Skill

Use this skill for scheduled maintenance runs that improve code quality without changing product behavior.

## Required Companion Skills

1. Apply `backend-standard` for architecture boundaries, integration isolation, and reliability expectations.
2. Apply `typescript-biome-style` for TypeScript safety, readability, and lint/format consistency.

## Maintenance Goals

1. Preserve existing runtime behavior while improving implementation quality.
2. Remove dead code, stale helpers, and unused imports safely.
3. Keep modules focused; split oversized files when responsibilities are mixed.
4. Follow existing design patterns and ownership boundaries in this repository.
5. Improve reliability with targeted tests for changed behavior paths.

## Guardrails

1. Stay project-agnostic and avoid assumptions tied to one workspace.
2. Do not move config, workflow sequencing, integration boundaries, or state-path ownership out of their designated modules.
3. Do not construct raw shell command strings in workflow logic; use helper modules.
4. Keep changes incremental and auditable, avoiding broad refactors that are not needed for the maintenance scope.
5. Prefer idempotent cleanup steps so reruns are safe.

## Validation

Run repository quality gates before finalizing:

1. `bun run check`
2. `bun run typecheck`
3. `bun test`

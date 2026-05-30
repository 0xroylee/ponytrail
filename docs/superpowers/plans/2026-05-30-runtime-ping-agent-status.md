# Runtime Ping Agent Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Force every agent returned by `GET /api/agents` offline when the server cannot ping the connected CLI runtime worker.

**Architecture:** Reuse the existing workflow websocket ping/pong protocol. Add a narrow `isRuntimeReachable()` method to the server CLI executor boundary, implement it in the workflow command broker, and have the agent CRUD route map list responses to offline when runtime health fails.

**Tech Stack:** Bun test, TypeScript, server route tests, existing `ws` websocket constants.

---

### Task 1: Agent Route Runtime Status Mapping

**Files:**
- Modify: `packages/server/tests/agent-skill-routes.test.ts`
- Modify: `packages/server/tests/agent-default-config-routes.test.ts`
- Modify: `packages/server/src/types/app.types.ts`
- Modify: `packages/server/src/routes/entity-crud.ts`
- Modify: `packages/server/src/http/app-routes.ts`

- [ ] **Step 1: Write failing route tests**

Add tests that create app instances with `cliExecutor.isRuntimeReachable = async () => false`, then assert every item returned by `GET /api/agents` has `status: "offline"` for persisted and config-backed agents.

- [ ] **Step 2: Run route tests to verify RED**

Run: `bun test packages/server/tests/agent-skill-routes.test.ts packages/server/tests/agent-default-config-routes.test.ts`

Expected: tests fail because route responses still preserve `online` statuses.

- [ ] **Step 3: Add the CLI executor health contract**

Add `isRuntimeReachable?(): Promise<boolean>;` to `CliExecutor` in `packages/server/src/types/app.types.ts`.

- [ ] **Step 4: Pass the health check into agent CRUD**

Extend `EntityCrudDeps` with `isRuntimeReachable?: () => Promise<boolean>` and pass `deps.cliExecutor.isRuntimeReachable` from `handleEntityCrudRoute`.

- [ ] **Step 5: Map unhealthy agent responses offline**

After list/get/default agent bodies are built, call the optional health check. If it returns `false` or rejects, copy every returned agent record with `status: "offline"`.

- [ ] **Step 6: Run route tests to verify GREEN**

Run: `bun test packages/server/tests/agent-skill-routes.test.ts packages/server/tests/agent-default-config-routes.test.ts`

Expected: route tests pass.

### Task 2: Broker Runtime Ping Health

**Files:**
- Modify: `packages/server/tests/workflow-command-broker.test.ts`
- Modify: `packages/server/src/workflow-data/types/workflow-command-broker.types.ts`
- Modify: `packages/server/src/workflow-data/workflow-command-broker.ts`

- [ ] **Step 1: Write failing broker tests**

Add tests that assert `isRuntimeReachable()` returns `false` with no worker and returns `true` only after a matching `pong` frame arrives from the active worker.

- [ ] **Step 2: Run broker tests to verify RED**

Run: `bun test packages/server/tests/workflow-command-broker.test.ts`

Expected: tests fail because `isRuntimeReachable` is not implemented.

- [ ] **Step 3: Implement broker ping tracking**

Add pending ping tracking in `createWorkflowCommandBroker`: send `{ type: "ping", requestId }` to the active worker, resolve `true` when `handleWorkerFrame` receives a matching `pong`, and resolve `false` on missing/closed worker or timeout.

- [ ] **Step 4: Run broker tests to verify GREEN**

Run: `bun test packages/server/tests/workflow-command-broker.test.ts`

Expected: broker tests pass.

### Task 3: Focused Verification

**Files:**
- Validate all modified server files.

- [ ] **Step 1: Run focused server tests**

Run: `bun test packages/server/tests/agent-skill-routes.test.ts packages/server/tests/agent-default-config-routes.test.ts packages/server/tests/workflow-command-broker.test.ts`

Expected: all selected tests pass.

- [ ] **Step 2: Run package checks**

Run: `bun run --filter devos-server check`

Expected: check passes, unless unrelated dirty files outside the scoped server runtime ping change still block formatting.

Run: `bun run --filter devos-server typecheck`

Expected: typecheck passes.

Run: `bun run --filter devos-server test`

Expected: server package tests pass.

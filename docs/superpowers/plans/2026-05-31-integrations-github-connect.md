# GitHub Integrations Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Integrations page that connects GitHub through local-safe device flow.

**Architecture:** Reuse the existing GitHub connection/repository API and add a focused web page plus small helpers. Server device-flow endpoints store the temporary device code in an HTTP-only cookie, poll GitHub from the server, and save the token/login without requiring a client secret.

**Tech Stack:** Next.js App Router, React Query, Express OpenAPI route validation, Bun tests.

---

### Task 1: Local-Safe GitHub OAuth Redirects

**Files:**
- Create: `packages/server/src/http/github-oauth-redirects.ts`
- Modify: `packages/server/src/http/github-oauth-service.ts`
- Modify: `packages/server/tests/github-oauth-routes.test.ts`
- Modify: `openapi.yaml`

- [ ] Write failing server tests for OAuth start with `origin=http://localhost:3100&returnTo=/integrations`, expecting `http://127.0.0.1:3100/api/github/oauth/callback` and a return cookie.
- [ ] Split redirect/cookie helpers into `github-oauth-redirects.ts`.
- [ ] Update OAuth start/callback to use stored loopback origin and return path.
- [ ] Document `origin` and `returnTo` query params in `openapi.yaml`.
- [ ] Run `rtk bun test packages/server/tests/github-oauth-routes.test.ts packages/server/tests/openapi-contract.test.ts`.

### Task 2: GitHub OAuth Start URL Utility

**Files:**
- Create: `packages/web/src/lib/api/github-oauth-start.ts`
- Test: `packages/web/tests/github-oauth-start.test.ts`

- [ ] Write failing tests for localhost-to-127.0.0.1 normalization and normal relative start URLs.
- [ ] Implement `buildGitHubOAuthStartUrl(returnTo, locationLike)`.
- [ ] Run `rtk bun test packages/web/tests/github-oauth-start.test.ts`.

### Task 3: Integrations Page UI

**Files:**
- Create: `packages/web/src/app/(operator)/integrations/page.tsx`
- Create: `packages/web/src/components/integrations/integrations-panel.tsx`
- Create: `packages/web/src/components/integrations/integrations-panel-utils.ts`
- Create: `packages/web/src/components/integrations/types/integrations-panel.types.ts`
- Create: `packages/web/tests/integrations-panel-utils.test.ts`
- Modify: `packages/web/src/components/web-shell/web-shell.constants.ts`
- Modify: `packages/web/src/components/web-shell/types/web-shell.types.ts`
- Modify: `packages/web/src/components/chat-room/chat-room-settings-sidebar.tsx`
- Modify: `packages/web/src/components/projects/projects-panel.tsx`

- [ ] Write failing utility tests for GitHub card states.
- [ ] Add `integrations` to nav types, content, and icon mapping.
- [ ] Build `IntegrationsPanel` using existing React Query hooks and UI primitives.
- [ ] Update Projects connect action to use the same OAuth start URL helper with `/projects`.
- [ ] Run `rtk bun test packages/web/tests/integrations-panel-utils.test.ts packages/web/tests/github-oauth-start.test.ts`.

### Task 4: Verification

**Files:**
- No new files.

- [ ] Run `rtk bun run --filter devos-server typecheck`.
- [ ] Run `rtk bun run --filter web typecheck`.
- [ ] Run `rtk bun run check`.
- [ ] Run `rtk bun test`.
- [ ] Run `rtk bun run --filter web build`.
- [ ] Start the web app and verify `/integrations` in the browser.

### Task 5: GitHub Device Flow Onboarding

**Files:**
- Create: `packages/server/src/http/github-device-flow-service.ts`
- Create: `packages/server/src/http/github-oauth-config.ts`
- Modify: `packages/server/src/http/github-repositories-routes.ts`
- Modify: `packages/server/src/http/github-oauth-service.ts`
- Modify: `packages/server/src/http/github-repositories-service.ts`
- Modify: `packages/server/src/http/types/github-repositories-api.types.ts`
- Modify: `packages/server/tests/github-oauth-routes.test.ts`
- Modify: `packages/server/tests/github-repositories-routes.test.ts`
- Modify: `packages/server/tests/openapi-contract.test.ts`
- Modify: `packages/web/src/lib/api/github-client.ts`
- Modify: `packages/web/src/lib/api/github-mutations.ts`
- Modify: `packages/web/src/lib/api/realtime-queries.ts`
- Modify: `packages/web/src/lib/api/query-keys.ts`
- Modify: `packages/web/src/lib/api/types/github.types.ts`
- Modify: `packages/web/src/lib/api/types/client.types.ts`
- Modify: `packages/web/src/components/integrations/integrations-panel.tsx`
- Modify: `packages/web/src/components/integrations/integrations-panel-utils.ts`
- Modify: `packages/web/src/components/integrations/types/integrations-panel.types.ts`
- Modify: `packages/web/tests/github-repositories-client.test.ts`
- Modify: `packages/web/tests/integrations-panel-utils.test.ts`
- Modify: `openapi.yaml`

- [x] Write failing server tests for device start with a client ID and no client secret.
- [x] Write failing server tests for pending and successful device polling.
- [x] Write failing repository tests proving device-flow connections do not require a client secret.
- [x] Write failing web API tests for device start and poll.
- [x] Write failing integration-state tests for the client-ID setup state.
- [x] Implement device start/poll routes and OpenAPI contracts.
- [x] Update the web API client, mutations, polling query, and integrations panel.
- [x] Run focused server and web tests after implementation.
- [x] Run package and repo verification gates.
- [x] Browser-verify the integrations page.

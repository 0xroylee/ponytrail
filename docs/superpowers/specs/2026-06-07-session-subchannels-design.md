# Session Subchannels Design

## Purpose

Task details currently feel detached from the session conversation. The operator UI should follow a Slack-like model where a session can contain selectable subchannels. The first subchannels are `Chat` and `Task Info`, both shown directly under the session in the left sidebar.

## Goals

- Show session subchannels as real sidebar navigation targets: project group, session row, then `Chat` and `Task Info`.
- Keep `Chat` as the default session view and preserve existing chat behavior.
- Replace the strange task-detail side surface with a main-panel `Task Info` channel that feels like part of the same chatroom.
- Use existing React Query patterns for cached data so switching between subchannels reuses session, task, activity, and token usage data.
- Preserve package boundaries: API access stays in `packages/web/src/lib/api`, realtime stays in `packages/web/src/lib/realtime`, and UI state stays in chat-room or shared UI helpers.

## Non-Goals

- Do not redesign the issues board.
- Do not change workflow execution, task creation, or agent orchestration behavior.
- Do not add new backend APIs unless existing task/session/activity endpoints cannot support the channel view.
- Do not add component rendering tests; use pure helper tests, typecheck/build, and browser verification for the visible UI.

## UX Model

The sidebar hierarchy becomes:

```text
Sessions
  Project
    Session A
      Chat
      Task Info
```

`Session A` expands when it is active or when the user opens it. Selecting `Chat` shows the existing conversation view. Selecting `Task Info` shows task metadata and execution context in the main chatroom panel, not in a side sheet.

`/session/:sessionId` should continue to work and default to `Chat`. The preferred durable routes are:

- `/session/:sessionId/chat`
- `/session/:sessionId/task-info`

Back/forward navigation, reloads, and shared URLs should preserve the selected subchannel.

## Task Info Channel

The `Task Info` channel should reuse the most useful existing task-detail content, but present it as a full main-panel view:

- task title, key, status, priority, and project
- linked PR and review/status information
- testing and mission delivery summary
- token usage summary when available
- recent task activity, execution result, and notes/comments
- concise task actions that already exist and are safe in this context

Empty or missing task states should be explicit but quiet. If a session has no linked task, the channel should render an empty state instead of failing or navigating away.

## Data And Caching

Data loading must follow existing React Query conventions:

- `Chat` continues using the current session/message query flow.
- `Task Info` uses `useQuery` through existing `src/lib/api/queries` and task activity query helpers.
- Query keys should be scoped by `sessionId` or `taskId` so cached data survives subchannel switches.
- Components should not call `fetch` directly.
- Sidebar subchannel navigation should not invalidate unrelated chat or task queries.

The initial implementation should prefer composing existing task, activity, and token usage queries over adding an aggregate API. A future aggregate endpoint can be considered only if the composed query waterfall becomes visibly slow or difficult to keep consistent.

## Components

Expected web changes:

- Add a small subchannel type, route parser, and URL builder for `chat` and `task-info`.
- Extend chat-room sidebar list helpers so active sessions can render child subchannel rows.
- Update session-row navigation to select `Chat` by default while allowing child rows to navigate to either channel.
- Split task-info rendering into a main-panel component that can reuse existing task detail utilities without keeping the side sheet as the primary surface.
- Remove or demote the old task detail trigger once `Task Info` covers the same user need.

Keep files below the repository TypeScript line limit. If chat route parsing or response parsing grows, split helpers into focused files instead of expanding existing large modules.

## Error Handling

- Missing session: keep current not-found behavior.
- Missing linked task: show a quiet `Task Info` empty state.
- Task query error: show an unavailable state inside the `Task Info` channel.
- Activity or usage query error: keep the task identity visible and omit only the failed subsection.
- Unknown subchannel route: default to `Chat`.

## Testing And Verification

Focused tests should cover:

- route parsing and URL building for session subchannels
- sidebar helper output for active session subchannel rows
- React Query key behavior where a pure helper exists
- task-info empty/error state helpers if added

Visible UI verification should include:

- desktop sidebar hierarchy and active child row
- mobile sidebar with expanded active session
- direct reload on `/session/:sessionId/task-info`
- switching between `Chat` and `Task Info` without losing chat state

Required checks after implementation:

- `bun run --filter web typecheck`
- `bun run --filter web build`
- relevant focused tests
- root quality gates before final handoff when the implementation branch is ready

## Risks

- The current main checkout may contain unrelated sidebar or issues-board changes; implementation should happen in an isolated branch or worktree.
- If the old side sheet remains visible alongside the new channel, users may see duplicate task surfaces. The implementation should make one primary path clear.
- If `Task Info` composes too many queries without cache reuse, the view could feel slow. React Query keys and existing cached task/session data are the first mitigation.

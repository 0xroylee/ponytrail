# Chat Session Agent Bubbles Design

## Scope

The Chat tab should read like a normal assistant conversation while an agent is
working. Execution updates, thinking notes, and agent output that arrive through
mission logs or live stream lines should appear as ordinary assistant-style
chat bubbles in the transcript.

Task Info remains the structured activity surface for detailed execution
records, commands, step metadata, PR/test status, and raw workflow context.

## Current Behavior

`ChatTranscript` renders persisted chat messages, plan content, a working
header, agent-output bubbles, activity sections, and fallback thinking/planning
lines. Agent-output bubbles are already built by
`createChatSessionAgentOutputs`, which reads agent messages from mission log
lines and stream lines while suppressing duplicates from persisted assistant
messages and plan content.

Activity sections still summarize tool/file/code activity as compact status
widgets such as coding or browsing. That makes Chat feel like a monitoring
panel instead of a conversation.

## Target Behavior

1. The Chat tab shows agent execution, thinking, and output updates as
   assistant-style transcript bubbles.
2. Persisted assistant messages and rendered plan messages are not duplicated.
3. Structured activity details stay available in Task Info rather than becoming
   another prominent Chat surface.
4. Empty, purely technical, or unsafe internal command/log payloads do not
   appear as conversational bubbles.

## Design

Keep `createChatSessionAgentOutputs` as the normalization boundary for
conversation-worthy agent output. Extend its coverage only where needed so it
can recognize safe conversational status/output text from stream and mission
log records.

Render those normalized outputs with the same visual language as assistant
messages. The transcript should place them in the existing message column after
persisted messages and plan content so the live work reads as a continuation of
the conversation.

Avoid showing structured activity sections in the Chat tab when equivalent
agent-output bubbles exist. Detailed activity remains in Task Info, preserving
the current session subchannel split.

## Test Plan

Add focused tests for the output-state helper:

1. Converts agent/status stream records into assistant bubble output.
2. Suppresses duplicates of persisted assistant messages and plan content.
3. Ignores raw command-only or empty structured records.
4. Preserves ordering and caps output to the existing maximum.

Run the relevant web checks after implementation:

1. `bun run --filter web typecheck`
2. `bun run --filter web build`
3. Focused helper tests, then wider gates as needed.

For visible UI verification, run the web app and inspect a session Chat tab in
the browser to confirm the update bubbles read like assistant messages and Task
Info still carries structured workflow detail.

## Risks

The main risk is leaking low-level command payloads into Chat. The
normalization boundary should only promote explicit agent-message or safe
status/detail fields, and tests should pin that behavior before UI changes.

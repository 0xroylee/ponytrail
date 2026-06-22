# Ponytrail

Ponytrail records agent file-change snapshots, shows the snapshot history tree, and can restore files from a previous snapshot.

## Onboard

Create the local `.ponytrail` workspace and install the bundled `pony-trail` skill for Claude, GitHub Copilot, and Codex:

```bash
npx ponytrail onboard --dir . --yes
```

With Bun:

```bash
bunx ponytrail onboard --dir . --yes
```

Useful options:

```bash
ponytrail onboard --name "My Project"
ponytrail onboard --home ~/.config-test
ponytrail onboard --agents claude,codex
```

Use the standalone skill installer only when you want to preview, reinstall, force overwrite, or add the prehook later:

```bash
ponytrail skills install pony-trail --dry-run
ponytrail skills install pony-trail --prehook
ponytrail skills install pony-trail --force
```

## View History

Show the snapshot tree:

```bash
ponytrail history
```

Filter to one session or print machine-readable output:

```bash
ponytrail history --session <session-id>
ponytrail history --json
```

Snapshots are read from:

```text
.agent-change-snapshots/
  snapshots.jsonl
  sessions/<session-id>/tree.md
```

## Revert A Snapshot

Preview the file actions first:

```bash
ponytrail revert <snapshot-id> --dry-run
```

Apply the revert:

```bash
ponytrail revert <snapshot-id> --yes
```

Revert restores files from the snapshot's `pre` state. If a file did not exist before the snapshot, Ponytrail deletes it during the revert.

## Local Development

```bash
bun install
bun run build
bun test
bun run check
```

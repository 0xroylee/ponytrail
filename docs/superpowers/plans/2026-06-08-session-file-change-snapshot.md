# Session File Change Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the latest per-session file change snapshot at successful workflow completion and render it as an expandable edited-files card in the session view.

**Architecture:** The CLI knows the exact execution folder after isolated-worktree preparation, while the server owns session persistence and realtime payloads. The CLI will ask the workflow-data socket to capture a snapshot for the task id and execution folder; the server will run structured git commands, persist a serialized JSON snapshot on `chat_sessions`, publish `chat.session.updated`, and the web client will parse and render the typed session field.

**Tech Stack:** Bun, TypeScript, Drizzle schema and SQL migrations, server workflow-data websocket, adapters `runCommand`, React/Next.js chat-room components, React Query/realtime session cache, Tailwind.

---

## Current Worktree Note

This checkout currently has unrelated dirty files under `packages/web/src/components/chat-room/` and `packages/web/tests/`. Do not stage, revert, or rewrite them unless a step below explicitly lists the file for this feature. Stage exact paths only.

## File Structure

- Create `packages/db/src/migrations/0022_chat_session_file_change_snapshot.sql`
  Adds the nullable database column.
- Modify `packages/db/src/schema/chat-sessions.schema.ts`
  Adds the Drizzle column.
- Modify `packages/server/src/chat/types/chat.types.ts`
  Adds server session snapshot contracts and update input.
- Modify `packages/server/src/chat/chat-mappers.ts`
  Parses persisted snapshot JSON into typed API records.
- Modify `packages/server/src/chat/chat-writes.ts`
  Serializes nullable snapshots on session updates.
- Create `packages/server/src/workspace/git-file-change-snapshot.ts`
  Reads and parses staged, unstaged, and untracked git file changes.
- Modify `packages/server/src/http/workspace-environment-routes.ts`
  Reuses shared diff parsing where practical without changing the route response.
- Modify `packages/server/src/workflow-data/types/workflow-data.types.ts`
  Adds the workflow-data action and payload/response contracts.
- Modify `packages/server/src/workflow-data/workflow-socket-protocol.ts`
  Allows the new workflow-data action.
- Modify `packages/server/src/workflow-data/workflow-data-service.ts`
  Routes the new action.
- Modify `packages/server/src/workflow-data/workflow-data-chat-actions.ts`
  Captures and persists the snapshot by task id.
- Modify `packages/server/tests/workflow-data-socket.test.ts`
  Covers capture, persistence, and realtime update.
- Create `packages/server/tests/git-file-change-snapshot.test.ts`
  Covers git numstat parsing, combining rows, and untracked file handling.
- Modify `packages/cli/src/features/workflow/workflow-data-protocol.ts`
  Mirrors the action and contract for the CLI client.
- Modify `packages/cli/src/features/workflow/reliable-workflow-data-client.ts`
  Buffers the new mutation if the workflow-data socket is temporarily unavailable.
- Modify `packages/cli/src/features/workflow/types/board-task-workflow-store.types.ts`
  Adds a store method for snapshot capture.
- Modify `packages/cli/src/features/workflow/board-task-workflow-store.ts`
  Sends the workflow-data capture action.
- Modify `packages/cli/src/features/workflow/types/workflow.types.ts`
  Adds an optional task-client method.
- Modify `packages/cli/src/features/workflow/board-task-workflow-client.ts`
  Implements the optional method.
- Create `packages/cli/src/features/workflow/mission/file-change-snapshot-recorder.ts`
  Isolates the done-stage capture decision and error swallowing.
- Modify `packages/cli/src/features/workflow/mission/issue-processor.ts`
  Calls capture after a successful workflow reaches `done`.
- Modify `packages/cli/tests/board-task-workflow-client.test.ts`
  Covers the outgoing workflow-data request.
- Create `packages/cli/tests/file-change-snapshot-recorder.test.ts`
  Covers completion capture decisions without a broad workflow harness.
- Modify `packages/web/src/lib/api/types/chat.types.ts`
  Adds web snapshot contracts.
- Modify `packages/web/src/lib/api/chat-response-parsers.ts`
  Parses valid snapshots and normalizes invalid/empty snapshots to `null`.
- Modify `packages/web/tests/chat-client.test.ts`
  Covers snapshot parsing.
- Update existing web `ChatSessionRecord` fixtures with `fileChangeSnapshot: null`.
- Create `packages/web/src/components/chat-room/chat-file-change-snapshot-state.ts`
  Owns pure visible-row and label logic.
- Create `packages/web/src/components/chat-room/types/chat-file-change-snapshot.types.ts`
  Owns UI helper types.
- Create `packages/web/src/components/chat-room/chat-file-change-snapshot-card.tsx`
  Renders the expandable card.
- Modify `packages/web/src/components/chat-room/chat-transcript.tsx`
  Inserts the card in the selected session transcript.
- Modify `packages/web/src/components/chat-room/types/chat-room.types.ts`
  Passes the typed session snapshot through existing props if required.
- Create `packages/web/tests/chat-file-change-snapshot-state.test.ts`
  Covers pure UI row expansion and labels.

---

### Task 1: Database And Chat Session Contracts

**Files:**
- Create: `packages/db/src/migrations/0022_chat_session_file_change_snapshot.sql`
- Modify: `packages/db/src/schema/chat-sessions.schema.ts`
- Modify: `packages/server/src/chat/types/chat.types.ts`
- Modify: `packages/server/src/chat/chat-mappers.ts`
- Modify: `packages/server/src/chat/chat-writes.ts`
- Test: `packages/server/tests/chat-send-service.test.ts`

- [ ] **Step 1: Write the failing server mapper/write test**

Append this test inside `describe("chat send service streaming", () => { ... })` in `packages/server/tests/chat-send-service.test.ts`:

```ts
	it("maps and serializes chat session file change snapshots", async () => {
		const snapshot = {
			fileCount: 2,
			additions: 8,
			deletions: 3,
			files: [
				{ path: "packages/web/src/app.tsx", additions: 5, deletions: 1 },
				{ path: "packages/server/src/api.ts", additions: 3, deletions: 2 },
			],
			capturedAt: "2026-06-08T07:00:00.000Z",
		};
		const session = chatSession({
			fileChangeSnapshot: JSON.stringify(snapshot),
		});
		const messages: ChatMessageRow[] = [];
		const repository = createRepository(session, messages);

		const updated = await repository.updateSession("session-1", {
			fileChangeSnapshot: JSON.stringify({
				...snapshot,
				fileCount: 1,
				files: [snapshot.files[0]],
			}),
		});

		expect(updated?.fileChangeSnapshot).toContain("packages/web/src/app.tsx");
	});
```

Then add a direct mapper expectation after importing `mapSession` from `../src/chat/chat-mappers`:

```ts
		expect(mapSession(session).fileChangeSnapshot).toEqual(snapshot);
```

Also update the local `chatSession()` helper in that file to return `fileChangeSnapshot: null` by default.

- [ ] **Step 2: Run the failing test**

Run:

```bash
rtk bun test packages/server/tests/chat-send-service.test.ts
```

Expected: TypeScript/runtime failure because `fileChangeSnapshot` is not part of the schema/type contract yet.

- [ ] **Step 3: Add the database migration**

Create `packages/db/src/migrations/0022_chat_session_file_change_snapshot.sql`:

```sql
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS file_change_snapshot text;
```

- [ ] **Step 4: Add the Drizzle schema field**

Modify `packages/db/src/schema/chat-sessions.schema.ts`:

```ts
	fileChangeSnapshot: text("file_change_snapshot"),
```

Place it after `pendingQuestions`.

- [ ] **Step 5: Add server snapshot types**

Modify `packages/server/src/chat/types/chat.types.ts`:

```ts
export interface ChatSessionFileChange {
	path: string;
	additions: number;
	deletions: number;
}

export interface ChatSessionFileChangeSnapshot {
	fileCount: number;
	additions: number;
	deletions: number;
	files: ChatSessionFileChange[];
	capturedAt: string;
}

export interface ChatSessionRecord
	extends Omit<ChatSessionRow, "pendingQuestions" | "fileChangeSnapshot"> {
	pendingQuestions: ChatClarificationQuestion[];
	fileChangeSnapshot: ChatSessionFileChangeSnapshot | null;
	workflowState?: ChatSessionWorkflowState | null;
}
```

Extend `ChatSessionUpdateInput`:

```ts
	fileChangeSnapshot?: ChatSessionFileChangeSnapshot | null;
```

- [ ] **Step 6: Parse persisted snapshot JSON in the mapper**

Modify `packages/server/src/chat/chat-mappers.ts` so `mapSession()` explicitly maps both parsed fields:

```ts
export function mapSession(session: ChatSessionRow): ChatSessionRecord {
	return {
		...session,
		pendingQuestions: parsePendingQuestions(session.pendingQuestions),
		fileChangeSnapshot: parseFileChangeSnapshot(session.fileChangeSnapshot),
	};
}
```

Add these helpers:

```ts
function parseFileChangeSnapshot(
	value: string | null,
): ChatSessionFileChangeSnapshot | null {
	if (!value) return null;
	try {
		const parsed = JSON.parse(value) as unknown;
		if (!isRecord(parsed)) return null;
		const files = Array.isArray(parsed.files)
			? parsed.files.flatMap(parseFileChange)
			: [];
		const fileCount = readNonNegativeNumber(parsed.fileCount);
		const additions = readNonNegativeNumber(parsed.additions);
		const deletions = readNonNegativeNumber(parsed.deletions);
		const capturedAt =
			typeof parsed.capturedAt === "string" ? parsed.capturedAt : "";
		if (!capturedAt || fileCount <= 0 || files.length === 0) return null;
		return { fileCount, additions, deletions, files, capturedAt };
	} catch {
		return null;
	}
}

function parseFileChange(value: unknown): ChatSessionFileChange[] {
	if (!isRecord(value) || typeof value.path !== "string" || !value.path.trim()) {
		return [];
	}
	return [
		{
			path: value.path.trim(),
			additions: readNonNegativeNumber(value.additions),
			deletions: readNonNegativeNumber(value.deletions),
		},
	];
}

function readNonNegativeNumber(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) && value > 0
		? value
		: 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

Import `ChatSessionFileChange` and `ChatSessionFileChangeSnapshot` as types from `./types/chat.types`.

- [ ] **Step 7: Serialize snapshots in chat writes**

Modify `packages/server/src/chat/chat-writes.ts` inside `updateChatSessionRow()`:

```ts
	if (input.fileChangeSnapshot !== undefined) {
		update.fileChangeSnapshot = input.fileChangeSnapshot
			? JSON.stringify(input.fileChangeSnapshot)
			: null;
	}
```

- [ ] **Step 8: Run the server test again**

Run:

```bash
rtk bun test packages/server/tests/chat-send-service.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 1**

Stage only these files:

```bash
rtk git add packages/db/src/migrations/0022_chat_session_file_change_snapshot.sql packages/db/src/schema/chat-sessions.schema.ts packages/server/src/chat/types/chat.types.ts packages/server/src/chat/chat-mappers.ts packages/server/src/chat/chat-writes.ts packages/server/tests/chat-send-service.test.ts
rtk git commit -m "feat: add chat session file change snapshot contract"
```

---

### Task 2: Server Git Snapshot Helper

**Files:**
- Create: `packages/server/src/workspace/git-file-change-snapshot.ts`
- Modify: `packages/server/src/http/workspace-environment-routes.ts`
- Test: `packages/server/tests/git-file-change-snapshot.test.ts`
- Test: `packages/server/tests/workspace-environment-routes.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `packages/server/tests/git-file-change-snapshot.test.ts`:

```ts
import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertCommandOk, runCommand } from "adapters";
import {
	parseGitNumstatRows,
	readGitFileChangeSnapshot,
} from "../src/workspace/git-file-change-snapshot";

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((directory) =>
			rm(directory, { recursive: true, force: true }),
		),
	);
});

describe("git file change snapshots", () => {
	it("combines staged and unstaged numstat rows by path", () => {
		const rows = parseGitNumstatRows(
			"2\t1\tpackages/web/app.tsx\n3\t4\tpackages/web/app.tsx\n-\t-\tasset.png\n",
		);

		expect(rows).toEqual([
			{ path: "packages/web/app.tsx", additions: 5, deletions: 5 },
			{ path: "asset.png", additions: 0, deletions: 0 },
		]);
	});

	it("reads tracked and untracked file changes from a repository", async () => {
		const folder = await tempDirectory();
		await git(folder, ["init", "-b", "main"]);
		await git(folder, ["config", "user.email", "test@example.com"]);
		await git(folder, ["config", "user.name", "Test User"]);
		await writeFile(path.join(folder, "tracked.txt"), "one\ntwo\n");
		await git(folder, ["add", "tracked.txt"]);
		await git(folder, ["commit", "-m", "initial"]);
		await writeFile(path.join(folder, "tracked.txt"), "one\nthree\nfour\n");
		await mkdir(path.join(folder, "src"), { recursive: true });
		await writeFile(path.join(folder, "src", "created.ts"), "alpha\nbeta\n");

		const snapshot = await readGitFileChangeSnapshot(folder, {
			capturedAt: "2026-06-08T07:00:00.000Z",
		});

		expect(snapshot).toEqual({
			fileCount: 2,
			additions: 4,
			deletions: 1,
			files: [
				{ path: "tracked.txt", additions: 2, deletions: 1 },
				{ path: "src/created.ts", additions: 2, deletions: 0 },
			],
			capturedAt: "2026-06-08T07:00:00.000Z",
		});
	});

	it("returns null for non-repository folders", async () => {
		const folder = await tempDirectory();

		await expect(readGitFileChangeSnapshot(folder)).resolves.toBeNull();
	});
});

async function tempDirectory(): Promise<string> {
	const directory = await mkdtemp(path.join(os.tmpdir(), "devos-git-snapshot-"));
	tempDirs.push(directory);
	return directory;
}

async function git(cwd: string, args: string[]): Promise<void> {
	const result = await runCommand("git", args, { cwd, timeoutMs: 5000 });
	assertCommandOk("git", args, result);
}
```

- [ ] **Step 2: Run the failing helper tests**

Run:

```bash
rtk bun test packages/server/tests/git-file-change-snapshot.test.ts
```

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Implement the helper**

Create `packages/server/src/workspace/git-file-change-snapshot.ts`:

```ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runCommand } from "adapters";
import type {
	ChatSessionFileChange,
	ChatSessionFileChangeSnapshot,
} from "../chat/types/chat.types";

const GIT_TIMEOUT_MS = 3000;

interface ReadSnapshotOptions {
	capturedAt?: string;
}

interface CommandResult {
	code: number;
	stdout: string;
	stderr: string;
}

export async function readGitFileChangeSnapshot(
	folder: string,
	options: ReadSnapshotOptions = {},
): Promise<ChatSessionFileChangeSnapshot | null> {
	const inside = await runGit(folder, ["rev-parse", "--is-inside-work-tree"]);
	if (inside.code !== 0 || inside.stdout.trim() !== "true") return null;

	const unstaged = await runGit(folder, ["diff", "--numstat"]);
	const staged = await runGit(folder, ["diff", "--cached", "--numstat"]);
	const trackedRows = mergeFileChanges([
		...parseGitNumstatRows(unstaged.stdout),
		...parseGitNumstatRows(staged.stdout),
	]);
	const untrackedRows = await readUntrackedFileChanges(folder);
	const files = mergeFileChanges([...trackedRows, ...untrackedRows]);
	if (files.length === 0) return null;

	return {
		fileCount: files.length,
		additions: files.reduce((total, file) => total + file.additions, 0),
		deletions: files.reduce((total, file) => total + file.deletions, 0),
		files,
		capturedAt: options.capturedAt ?? new Date().toISOString(),
	};
}

export function parseGitNumstatRows(raw: string): ChatSessionFileChange[] {
	return mergeFileChanges(
		raw.split(/\r?\n/).flatMap((line) => {
			const trimmed = line.trim();
			if (!trimmed) return [];
			const tabParts = trimmed.split("\t");
			const parts =
				tabParts.length >= 3 ? tabParts : trimmed.split(/\s+/);
			const [added, deleted, ...pathParts] = parts;
			const filePath = pathParts.join("\t").trim();
			if (!filePath) return [];
			return [
				{
					path: filePath,
					additions: parseDiffNumber(added),
					deletions: parseDiffNumber(deleted),
				},
			];
		}),
	);
}

export function mergeFileChanges(
	files: ChatSessionFileChange[],
): ChatSessionFileChange[] {
	const byPath = new Map<string, ChatSessionFileChange>();
	for (const file of files) {
		const existing = byPath.get(file.path);
		if (existing) {
			existing.additions += file.additions;
			existing.deletions += file.deletions;
		} else {
			byPath.set(file.path, { ...file });
		}
	}
	return [...byPath.values()];
}

async function readUntrackedFileChanges(
	folder: string,
): Promise<ChatSessionFileChange[]> {
	const untracked = await runGit(folder, [
		"ls-files",
		"--others",
		"--exclude-standard",
	]);
	if (untracked.code !== 0) return [];
	const files = await Promise.all(
		untracked.stdout
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean)
			.map(async (filePath) => ({
				path: filePath,
				additions: await countTextLines(path.join(folder, filePath)),
				deletions: 0,
			})),
	);
	return files;
}

async function countTextLines(filePath: string): Promise<number> {
	try {
		const content = await readFile(filePath, "utf8");
		if (!content) return 0;
		return content.endsWith("\n")
			? content.split("\n").length - 1
			: content.split("\n").length;
	} catch {
		return 0;
	}
}

async function runGit(folder: string, args: string[]): Promise<CommandResult> {
	try {
		return await runCommand("git", args, {
			cwd: folder,
			timeoutMs: GIT_TIMEOUT_MS,
		});
	} catch (error) {
		return {
			code: 1,
			stdout: "",
			stderr: error instanceof Error ? error.message : String(error),
		};
	}
}

function parseDiffNumber(value: string | undefined): number {
	if (!value || value === "-") return 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
```

- [ ] **Step 4: Reuse parsing in the environment route**

Modify `packages/server/src/http/workspace-environment-routes.ts`:

```ts
import { parseGitNumstatRows } from "../workspace/git-file-change-snapshot";
```

Replace `addDiffStats()` with:

```ts
function addDiffStats(
	total: { added: number; deleted: number },
	raw: string,
): { added: number; deleted: number } {
	for (const file of parseGitNumstatRows(raw)) {
		total.added += file.additions;
		total.deleted += file.deletions;
	}
	return total;
}
```

Leave `parseDiffNumber()` in place only if it still has a local caller; otherwise remove it.

- [ ] **Step 5: Run helper and environment tests**

Run:

```bash
rtk bun test packages/server/tests/git-file-change-snapshot.test.ts packages/server/tests/workspace-environment-routes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
rtk git add packages/server/src/workspace/git-file-change-snapshot.ts packages/server/src/http/workspace-environment-routes.ts packages/server/tests/git-file-change-snapshot.test.ts packages/server/tests/workspace-environment-routes.test.ts
rtk git commit -m "feat: read git file change snapshots"
```

---

### Task 3: Workflow-Data Capture Action

**Files:**
- Modify: `packages/server/src/workflow-data/types/workflow-data.types.ts`
- Modify: `packages/server/src/workflow-data/workflow-socket-protocol.ts`
- Modify: `packages/server/src/workflow-data/workflow-data-service.ts`
- Modify: `packages/server/src/workflow-data/workflow-data-chat-actions.ts`
- Test: `packages/server/tests/workflow-data-socket.test.ts`

- [ ] **Step 1: Write the failing workflow-data test**

In `packages/server/tests/workflow-data-socket.test.ts`, add imports:

```ts
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertCommandOk, runCommand } from "adapters";
```

Add this test after the existing chat clarification test:

```ts
	it("captures chat file change snapshots by task id", async () => {
		const { socket, events, db } = await setupSocket();
		const folder = await tempGitRepository();
		await db.insert(chatSessionsTable).values({
			id: "chat-1",
			workspaceId: "owner-1",
			projectId: "project-1",
			taskId: "task-1",
			title: "Task chat",
			pendingRequest: null,
			pendingQuestions: null,
			fileChangeSnapshot: null,
			archived: false,
			createdAt: "2026-05-13T00:00:00.000Z",
			updatedAt: "2026-05-13T00:00:00.000Z",
		});

		const response = await sendWorkflowDataRequest(
			socket,
			"chat.captureFileChangeSnapshot",
			{ taskId: "task-1", folder },
		);
		const [session] = await db.select().from(chatSessionsTable);
		const snapshot = JSON.parse(session?.fileChangeSnapshot ?? "{}") as {
			fileCount: number;
			additions: number;
			deletions: number;
			files: Array<{ path: string }>;
		};

		expect(response.payload).toMatchObject({ captured: true });
		expect(snapshot.fileCount).toBe(1);
		expect(snapshot.additions).toBeGreaterThan(0);
		expect(snapshot.deletions).toBeGreaterThan(0);
		expect(snapshot.files[0]).toMatchObject({ path: "tracked.txt" });
		expect(events.map((event) => event.type)).toContain(
			"chat.session.updated",
		);
	});
```

Add helpers near the bottom of the test file:

```ts
async function tempGitRepository(): Promise<string> {
	const folder = await mkdtemp(path.join(os.tmpdir(), "devos-workflow-git-"));
	await git(folder, ["init", "-b", "main"]);
	await git(folder, ["config", "user.email", "test@example.com"]);
	await git(folder, ["config", "user.name", "Test User"]);
	await writeFile(path.join(folder, "tracked.txt"), "one\ntwo\n");
	await git(folder, ["add", "tracked.txt"]);
	await git(folder, ["commit", "-m", "initial"]);
	await writeFile(path.join(folder, "tracked.txt"), "one\nthree\nfour\n");
	return folder;
}

async function git(cwd: string, args: string[]): Promise<void> {
	const result = await runCommand("git", args, { cwd, timeoutMs: 5000 });
	assertCommandOk("git", args, result);
}
```

- [ ] **Step 2: Run the failing workflow-data test**

Run:

```bash
rtk bun test packages/server/tests/workflow-data-socket.test.ts
```

Expected: FAIL with unsupported workflow action.

- [ ] **Step 3: Add the server workflow-data contract**

Modify `packages/server/src/workflow-data/types/workflow-data.types.ts`:

```ts
	| "chat.captureFileChangeSnapshot"
```

Add interfaces near the chat clarification contracts:

```ts
export interface WorkflowChatFileChangeSnapshotRequest {
	taskId: string;
	folder: string;
}

export interface WorkflowChatFileChangeSnapshotResponse {
	captured: boolean;
	reason?: "session_not_found" | "empty_snapshot" | "update_failed";
}
```

- [ ] **Step 4: Allow the action in socket parsing**

Modify `packages/server/src/workflow-data/workflow-socket-protocol.ts` and add this string to `WORKFLOW_ACTIONS`:

```ts
	"chat.captureFileChangeSnapshot",
```

- [ ] **Step 5: Implement the chat action**

Modify `packages/server/src/workflow-data/workflow-data-chat-actions.ts` imports:

```ts
import { readGitFileChangeSnapshot } from "../workspace/git-file-change-snapshot";
import type {
	WorkflowChatFileChangeSnapshotRequest,
	WorkflowChatFileChangeSnapshotResponse,
} from "./types/workflow-data.types";
```

Add:

```ts
export async function captureChatFileChangeSnapshot(
	context: WorkflowDataContext,
	input: WorkflowChatFileChangeSnapshotRequest,
): Promise<WorkflowChatFileChangeSnapshotResponse> {
	const repository = createChatRepository(context.db);
	const session = await repository.getSessionByTaskId(input.taskId);
	if (!session) {
		return { captured: false, reason: "session_not_found" };
	}
	const snapshot = await readGitFileChangeSnapshot(input.folder);
	if (!snapshot) {
		return { captured: false, reason: "empty_snapshot" };
	}
	const updatedSession = await updateChatSessionRow(repository, session.id, {
		fileChangeSnapshot: snapshot,
	});
	if (!updatedSession) {
		return { captured: false, reason: "update_failed" };
	}
	context.realtimeEvents?.publish({
		type: "chat.session.updated",
		session: mapSession(updatedSession),
	});
	return { captured: true };
}
```

- [ ] **Step 6: Route the service action**

Modify `packages/server/src/workflow-data/workflow-data-service.ts` imports:

```ts
	WorkflowChatFileChangeSnapshotRequest,
```

Import the action:

```ts
	captureChatFileChangeSnapshot,
```

Add a switch case:

```ts
		case "chat.captureFileChangeSnapshot":
			return captureChatFileChangeSnapshot(
				context,
				readPayload<WorkflowChatFileChangeSnapshotRequest>(payload),
			);
```

- [ ] **Step 7: Run the workflow-data test**

Run:

```bash
rtk bun test packages/server/tests/workflow-data-socket.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 3**

```bash
rtk git add packages/server/src/workflow-data/types/workflow-data.types.ts packages/server/src/workflow-data/workflow-socket-protocol.ts packages/server/src/workflow-data/workflow-data-service.ts packages/server/src/workflow-data/workflow-data-chat-actions.ts packages/server/tests/workflow-data-socket.test.ts
rtk git commit -m "feat: capture chat file snapshots through workflow data"
```

---

### Task 4: CLI Completion Capture

**Files:**
- Modify: `packages/cli/src/features/workflow/workflow-data-protocol.ts`
- Modify: `packages/cli/src/features/workflow/reliable-workflow-data-client.ts`
- Modify: `packages/cli/src/features/workflow/types/board-task-workflow-store.types.ts`
- Modify: `packages/cli/src/features/workflow/board-task-workflow-store.ts`
- Modify: `packages/cli/src/features/workflow/types/workflow.types.ts`
- Modify: `packages/cli/src/features/workflow/board-task-workflow-client.ts`
- Create: `packages/cli/src/features/workflow/mission/file-change-snapshot-recorder.ts`
- Modify: `packages/cli/src/features/workflow/mission/issue-processor.ts`
- Test: `packages/cli/tests/board-task-workflow-client.test.ts`
- Test: `packages/cli/tests/file-change-snapshot-recorder.test.ts`

- [ ] **Step 1: Write the failing board task client test**

Modify `packages/cli/tests/board-task-workflow-client.test.ts` in the mutation test:

```ts
		await client.recordFileChangeSnapshot?.("task-1", "/tmp/devos-worktree");
```

Extend the expected calls array:

```ts
			{
				action: "chat.captureFileChangeSnapshot",
				payload: { taskId: "task-1", folder: "/tmp/devos-worktree" },
			},
```

- [ ] **Step 2: Run the failing client test**

Run:

```bash
rtk bun test packages/cli/tests/board-task-workflow-client.test.ts
```

Expected: FAIL because `recordFileChangeSnapshot` is not implemented.

- [ ] **Step 3: Mirror the workflow-data contract in CLI**

Modify `packages/cli/src/features/workflow/workflow-data-protocol.ts`:

```ts
	| "chat.captureFileChangeSnapshot"
```

Add:

```ts
export interface WorkflowChatFileChangeSnapshotRequest {
	taskId: string;
	folder: string;
}
```

- [ ] **Step 4: Buffer the mutation**

Modify `packages/cli/src/features/workflow/reliable-workflow-data-client.ts`:

```ts
	"chat.captureFileChangeSnapshot",
```

Add it to `BUFFERABLE_ACTIONS`.

- [ ] **Step 5: Add store and task-client methods**

Modify `packages/cli/src/features/workflow/types/board-task-workflow-store.types.ts`:

```ts
	captureFileChangeSnapshot(taskId: string, folder: string): Promise<void>;
```

Modify `packages/cli/src/features/workflow/board-task-workflow-store.ts`:

```ts
	async captureFileChangeSnapshot(taskId, folder) {
		await client.request("chat.captureFileChangeSnapshot", {
			taskId,
			folder,
		});
	},
```

Modify `packages/cli/src/features/workflow/types/workflow.types.ts`:

```ts
	recordFileChangeSnapshot?(issueId: string, folder: string): Promise<void>;
```

Modify `packages/cli/src/features/workflow/board-task-workflow-client.ts`:

```ts
	async recordFileChangeSnapshot(
		issueId: string,
		folder: string,
	): Promise<void> {
		await this.store.captureFileChangeSnapshot(issueId, folder);
	}
```

- [ ] **Step 6: Run the board task client test**

Run:

```bash
rtk bun test packages/cli/tests/board-task-workflow-client.test.ts
```

Expected: PASS.

- [ ] **Step 7: Write the failing completion capture helper test**

Create `packages/cli/tests/file-change-snapshot-recorder.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { recordFileChangeSnapshotIfDone } from "../src/features/workflow/mission/file-change-snapshot-recorder";

describe("file change snapshot recorder", () => {
	it("records file change snapshots after successful done workflows", async () => {
		const snapshots: Array<{ issueId: string; folder: string }> = [];

		const result = await recordFileChangeSnapshotIfDone({
			stage: "done",
			issueId: "task-1",
			executionPath: "/tmp/devos-worktree",
			recordFileChangeSnapshot: async (issueId, folder) => {
				snapshots.push({ issueId, folder });
			},
		});

		expect(result).toBe("captured");
		expect(snapshots).toEqual([
			{ issueId: "task-1", folder: "/tmp/devos-worktree" },
		]);
	});

	it("skips non-done workflows and missing clients", async () => {
		const snapshots: Array<{ issueId: string; folder: string }> = [];

		const running = await recordFileChangeSnapshotIfDone({
			stage: "in_progress",
			issueId: "task-1",
			executionPath: "/tmp/devos-worktree",
			recordFileChangeSnapshot: async (issueId, folder) => {
				snapshots.push({ issueId, folder });
			},
		});
		const unavailable = await recordFileChangeSnapshotIfDone({
			stage: "done",
			issueId: "task-1",
			executionPath: "/tmp/devos-worktree",
		});

		expect(running).toBe("skipped");
		expect(unavailable).toBe("unavailable");
		expect(snapshots).toEqual([]);
	});

	it("reports capture failures without throwing", async () => {
		const errors: string[] = [];

		const result = await recordFileChangeSnapshotIfDone({
			stage: "done",
			issueId: "task-1",
			executionPath: "/tmp/devos-worktree",
			recordFileChangeSnapshot: async () => {
				throw new Error("socket unavailable");
			},
			onError: (error) => {
				errors.push(error instanceof Error ? error.message : String(error));
			},
		});

		expect(result).toBe("failed");
		expect(errors).toEqual(["socket unavailable"]);
	});
});
```

- [ ] **Step 8: Run the failing completion capture helper test**

Run:

```bash
rtk bun test packages/cli/tests/file-change-snapshot-recorder.test.ts
```

Expected: FAIL because the helper module does not exist.

- [ ] **Step 9: Implement the completion capture helper**

Create `packages/cli/src/features/workflow/mission/file-change-snapshot-recorder.ts`:

```ts
import type { WorkflowStage } from "../../types";

export type FileChangeSnapshotRecordResult =
	| "captured"
	| "failed"
	| "skipped"
	| "unavailable";

export interface FileChangeSnapshotRecordInput {
	stage: WorkflowStage;
	issueId: string;
	executionPath: string;
	recordFileChangeSnapshot?: (
		issueId: string,
		folder: string,
	) => Promise<void>;
	onError?: (error: unknown) => void;
}

export async function recordFileChangeSnapshotIfDone({
	stage,
	issueId,
	executionPath,
	recordFileChangeSnapshot,
	onError,
}: FileChangeSnapshotRecordInput): Promise<FileChangeSnapshotRecordResult> {
	if (stage !== "done") return "skipped";
	if (!recordFileChangeSnapshot) return "unavailable";
	try {
		await recordFileChangeSnapshot(issueId, executionPath);
		return "captured";
	} catch (error) {
		onError?.(error);
		return "failed";
	}
}
```

- [ ] **Step 10: Wire the helper into the issue processor**

Modify `packages/cli/src/features/workflow/mission/issue-processor.ts` imports:

```ts
import { recordFileChangeSnapshotIfDone } from "./file-change-snapshot-recorder";
```

Inside `executeIssueWithLease()`, after `await new IssuePipelineExecutor(...).execute(runState);`, add:

```ts
		await recordFileChangeSnapshotIfDone({
			stage: runState.stage,
			issueId: runState.issue.id,
			executionPath: executionConfig.executionPath,
			recordFileChangeSnapshot:
				this.input.taskClient.recordFileChangeSnapshot?.bind(
					this.input.taskClient,
				),
			onError: (error) => {
				issueLogger.warn(
					{ err: error instanceof Error ? error.message : String(error) },
					"Failed to record session file change snapshot",
				);
			},
		});
```

- [ ] **Step 11: Run CLI tests**

Run:

```bash
rtk bun test packages/cli/tests/board-task-workflow-client.test.ts packages/cli/tests/file-change-snapshot-recorder.test.ts
```

Expected: PASS for the focused tests.

- [ ] **Step 12: Commit Task 4**

```bash
rtk git add packages/cli/src/features/workflow/workflow-data-protocol.ts packages/cli/src/features/workflow/reliable-workflow-data-client.ts packages/cli/src/features/workflow/types/board-task-workflow-store.types.ts packages/cli/src/features/workflow/board-task-workflow-store.ts packages/cli/src/features/workflow/types/workflow.types.ts packages/cli/src/features/workflow/board-task-workflow-client.ts packages/cli/src/features/workflow/mission/file-change-snapshot-recorder.ts packages/cli/src/features/workflow/mission/issue-processor.ts packages/cli/tests/board-task-workflow-client.test.ts packages/cli/tests/file-change-snapshot-recorder.test.ts
rtk git commit -m "feat: record file snapshots after workflow completion"
```

---

### Task 5: Web API Types And Parsing

**Files:**
- Modify: `packages/web/src/lib/api/types/chat.types.ts`
- Modify: `packages/web/src/lib/api/chat-response-parsers.ts`
- Modify: `packages/web/tests/chat-client.test.ts`
- Modify: web tests with `ChatSessionRecord` fixtures, including `packages/web/tests/chat-room-selection.test.ts`, `packages/web/tests/chat-realtime.test.ts`, `packages/web/tests/chat-room-stream-utils.test.ts`, and `packages/web/tests/chat-session-rerun-state.test.ts`

- [ ] **Step 1: Write the failing parser test**

Add a test to `packages/web/tests/chat-client.test.ts`:

```ts
	it("parses valid chat session file change snapshots", async () => {
		const fetchFn = (async () =>
			okJsonResponse({
				id: "session-1",
				workspaceId: "owner-1",
				projectId: "default",
				taskId: "task-1",
				title: "Untitled",
				pendingRequest: null,
				pendingQuestions: [],
				archived: false,
				workflowState: "done",
				fileChangeSnapshot: {
					fileCount: 2,
					additions: 8,
					deletions: 3,
					files: [
						{ path: "packages/web/app.tsx", additions: 5, deletions: 1 },
						{ path: "packages/server/api.ts", additions: 3, deletions: 2 },
					],
					capturedAt: "2026-06-08T07:00:00.000Z",
				},
				createdAt: "2026-05-20T00:00:00.000Z",
				updatedAt: "2026-05-20T00:01:00.000Z",
			})) as typeof fetch;
		const client = createApiClient({ fetchFn });

		const session = await client.createChatSession({ workspaceId: "owner-1" });

		expect(session.fileChangeSnapshot).toEqual({
			fileCount: 2,
			additions: 8,
			deletions: 3,
			files: [
				{ path: "packages/web/app.tsx", additions: 5, deletions: 1 },
				{ path: "packages/server/api.ts", additions: 3, deletions: 2 },
			],
			capturedAt: "2026-06-08T07:00:00.000Z",
		});
	});

	it("normalizes malformed chat session file change snapshots to null", async () => {
		const fetchFn = (async () =>
			okJsonResponse({
				id: "session-1",
				workspaceId: "owner-1",
				projectId: "default",
				taskId: "task-1",
				title: "Untitled",
				pendingRequest: null,
				pendingQuestions: [],
				archived: false,
				fileChangeSnapshot: { fileCount: 1, files: [] },
				createdAt: "2026-05-20T00:00:00.000Z",
				updatedAt: "2026-05-20T00:01:00.000Z",
			})) as typeof fetch;
		const client = createApiClient({ fetchFn });

		const session = await client.createChatSession({ workspaceId: "owner-1" });

		expect(session.fileChangeSnapshot).toBeNull();
	});
```

- [ ] **Step 2: Run the failing parser test**

Run:

```bash
rtk bun test packages/web/tests/chat-client.test.ts
```

Expected: FAIL because `fileChangeSnapshot` is missing.

- [ ] **Step 3: Add web API types**

Modify `packages/web/src/lib/api/types/chat.types.ts`:

```ts
export interface ChatSessionFileChange {
	path: string;
	additions: number;
	deletions: number;
}

export interface ChatSessionFileChangeSnapshot {
	fileCount: number;
	additions: number;
	deletions: number;
	files: ChatSessionFileChange[];
	capturedAt: string;
}
```

Add to `ChatSessionRecord`:

```ts
	fileChangeSnapshot: ChatSessionFileChangeSnapshot | null;
```

- [ ] **Step 4: Parse the snapshot**

Modify `packages/web/src/lib/api/chat-response-parsers.ts` and add to the returned session:

```ts
		fileChangeSnapshot: readFileChangeSnapshot(row.fileChangeSnapshot),
```

Add helpers:

```ts
function readFileChangeSnapshot(
	value: unknown,
): ChatSessionFileChangeSnapshot | null {
	if (value === null || value === undefined) return null;
	if (typeof value !== "object" || Array.isArray(value)) return null;
	const row = value as Record<string, unknown>;
	const files = Array.isArray(row.files)
		? row.files.flatMap(readFileChange)
		: [];
	const fileCount = readNonNegativeNumber(row.fileCount);
	const additions = readNonNegativeNumber(row.additions);
	const deletions = readNonNegativeNumber(row.deletions);
	const capturedAt = typeof row.capturedAt === "string" ? row.capturedAt : "";
	if (fileCount <= 0 || files.length === 0 || !capturedAt) return null;
	return { fileCount, additions, deletions, files, capturedAt };
}

function readFileChange(value: unknown): ChatSessionFileChange[] {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return [];
	}
	const row = value as Record<string, unknown>;
	if (typeof row.path !== "string" || !row.path.trim()) return [];
	return [
		{
			path: row.path.trim(),
			additions: readNonNegativeNumber(row.additions),
			deletions: readNonNegativeNumber(row.deletions),
		},
	];
}

function readNonNegativeNumber(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) && value > 0
		? value
		: 0;
}
```

Import `ChatSessionFileChangeSnapshot` as a type.

- [ ] **Step 5: Update fixtures**

Add `fileChangeSnapshot: null` to every object literal that returns `ChatSessionRecord`. Known files from current context:

```ts
fileChangeSnapshot: null,
```

Update at least:

```text
packages/web/tests/chat-room-selection.test.ts
packages/web/tests/chat-realtime.test.ts
packages/web/tests/chat-room-stream-utils.test.ts
packages/web/tests/chat-session-rerun-state.test.ts
packages/web/src/lib/api/client.typecheck.ts
```

- [ ] **Step 6: Run web parser tests**

Run:

```bash
rtk bun test packages/web/tests/chat-client.test.ts packages/web/tests/chat-room-selection.test.ts packages/web/tests/chat-realtime.test.ts packages/web/tests/chat-room-stream-utils.test.ts packages/web/tests/chat-session-rerun-state.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 5**

```bash
rtk git add packages/web/src/lib/api/types/chat.types.ts packages/web/src/lib/api/chat-response-parsers.ts packages/web/tests/chat-client.test.ts packages/web/tests/chat-room-selection.test.ts packages/web/tests/chat-realtime.test.ts packages/web/tests/chat-room-stream-utils.test.ts packages/web/tests/chat-session-rerun-state.test.ts packages/web/src/lib/api/client.typecheck.ts
rtk git commit -m "feat: parse chat session file snapshots"
```

---

### Task 6: Web Snapshot Card

**Files:**
- Create: `packages/web/src/components/chat-room/types/chat-file-change-snapshot.types.ts`
- Create: `packages/web/src/components/chat-room/chat-file-change-snapshot-state.ts`
- Create: `packages/web/src/components/chat-room/chat-file-change-snapshot-card.tsx`
- Modify: `packages/web/src/components/chat-room/chat-transcript.tsx`
- Test: `packages/web/tests/chat-file-change-snapshot-state.test.ts`

- [ ] **Step 1: Write the failing pure UI helper test**

Create `packages/web/tests/chat-file-change-snapshot-state.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
	createChatFileChangeSnapshotView,
	formatFileChangeTotal,
} from "../src/components/chat-room/chat-file-change-snapshot-state";
import type { ChatSessionFileChangeSnapshot } from "../src/lib/api";

describe("chat file change snapshot state", () => {
	it("shows the first three rows and remaining count by default", () => {
		const view = createChatFileChangeSnapshotView(snapshot(), false);

		expect(view).toEqual({
			fileCountLabel: "Edited 4 files",
			totalLabel: { additions: "+10", deletions: "-4" },
			visibleFiles: snapshot().files.slice(0, 3),
			remainingCount: 1,
			toggleLabel: "Show 1 more file",
		});
	});

	it("shows all rows when expanded", () => {
		const view = createChatFileChangeSnapshotView(snapshot(), true);

		expect(view.visibleFiles).toHaveLength(4);
		expect(view.remainingCount).toBe(0);
		expect(view.toggleLabel).toBe("Show fewer files");
	});

	it("formats additions and deletions", () => {
		expect(formatFileChangeTotal({ additions: 3, deletions: 0 })).toEqual({
			additions: "+3",
			deletions: "-0",
		});
	});
});

function snapshot(): ChatSessionFileChangeSnapshot {
	return {
		fileCount: 4,
		additions: 10,
		deletions: 4,
		capturedAt: "2026-06-08T07:00:00.000Z",
		files: [
			{ path: "a.ts", additions: 1, deletions: 1 },
			{ path: "b.ts", additions: 2, deletions: 1 },
			{ path: "c.ts", additions: 3, deletions: 1 },
			{ path: "d.ts", additions: 4, deletions: 1 },
		],
	};
}
```

- [ ] **Step 2: Run the failing UI helper test**

Run:

```bash
rtk bun test packages/web/tests/chat-file-change-snapshot-state.test.ts
```

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Add UI helper types**

Create `packages/web/src/components/chat-room/types/chat-file-change-snapshot.types.ts`:

```ts
import type {
	ChatSessionFileChange,
	ChatSessionFileChangeSnapshot,
} from "@/lib/api";

export interface ChatFileChangeSnapshotView {
	fileCountLabel: string;
	totalLabel: ChatFileChangeTotalLabel;
	visibleFiles: ChatSessionFileChange[];
	remainingCount: number;
	toggleLabel: string | null;
}

export interface ChatFileChangeTotalLabel {
	additions: string;
	deletions: string;
}

export interface ChatFileChangeSnapshotCardProps {
	snapshot: ChatSessionFileChangeSnapshot | null;
}
```

- [ ] **Step 4: Add the pure UI helper**

Create `packages/web/src/components/chat-room/chat-file-change-snapshot-state.ts`:

```ts
import type { ChatSessionFileChangeSnapshot } from "@/lib/api";
import type {
	ChatFileChangeSnapshotView,
	ChatFileChangeTotalLabel,
} from "./types/chat-file-change-snapshot.types";

const DEFAULT_VISIBLE_FILE_COUNT = 3;

export function createChatFileChangeSnapshotView(
	snapshot: ChatSessionFileChangeSnapshot,
	expanded: boolean,
): ChatFileChangeSnapshotView {
	const visibleFiles = expanded
		? snapshot.files
		: snapshot.files.slice(0, DEFAULT_VISIBLE_FILE_COUNT);
	const remainingCount = Math.max(snapshot.files.length - visibleFiles.length, 0);
	return {
		fileCountLabel: `Edited ${snapshot.fileCount} ${
			snapshot.fileCount === 1 ? "file" : "files"
		}`,
		totalLabel: formatFileChangeTotal(snapshot),
		visibleFiles,
		remainingCount,
		toggleLabel: expanded
			? "Show fewer files"
			: remainingCount > 0
				? `Show ${remainingCount} more ${
						remainingCount === 1 ? "file" : "files"
					}`
				: null,
	};
}

export function formatFileChangeTotal(input: {
	additions: number;
	deletions: number;
}): ChatFileChangeTotalLabel {
	return {
		additions: `+${input.additions}`,
		deletions: `-${input.deletions}`,
	};
}
```

- [ ] **Step 5: Run the UI helper test**

Run:

```bash
rtk bun test packages/web/tests/chat-file-change-snapshot-state.test.ts
```

Expected: PASS.

- [ ] **Step 6: Add the card component**

Create `packages/web/src/components/chat-room/chat-file-change-snapshot-card.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { FileDiff } from "lucide-react";
import { type ReactElement, useState } from "react";
import {
	createChatFileChangeSnapshotView,
	formatFileChangeTotal,
} from "./chat-file-change-snapshot-state";
import type { ChatFileChangeSnapshotCardProps } from "./types/chat-file-change-snapshot.types";

export function ChatFileChangeSnapshotCard({
	snapshot,
}: ChatFileChangeSnapshotCardProps): ReactElement | null {
	const [expanded, setExpanded] = useState(false);
	if (!snapshot || snapshot.files.length === 0) return null;
	const view = createChatFileChangeSnapshotView(snapshot, expanded);
	return (
		<article className="grid overflow-hidden rounded-md border border-border bg-surface-panel text-sm text-zinc-100">
			<header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
				<div className="flex min-w-0 items-center gap-3">
					<div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-background text-zinc-300">
						<FileDiff className="h-4 w-4" aria-hidden="true" />
					</div>
					<div className="min-w-0">
						<Typography className="truncate text-base font-medium">
							{view.fileCountLabel}
						</Typography>
						<FileChangeTotal additions={snapshot.additions} deletions={snapshot.deletions} />
					</div>
				</div>
			</header>
			<div className="grid">
				{view.visibleFiles.map((file) => {
					const total = formatFileChangeTotal(file);
					return (
						<div
							className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-2"
							key={file.path}
						>
							<Typography className="truncate text-zinc-100">
								{file.path}
							</Typography>
							<span className="flex items-center gap-2 tabular-nums">
								<Typography as="span" className="text-emerald-400">
									{total.additions}
								</Typography>
								<Typography as="span" className="text-red-400">
									{total.deletions}
								</Typography>
							</span>
						</div>
					);
				})}
			</div>
			{view.toggleLabel ? (
				<div className="bg-surface-active/30 px-2 py-1">
					<Button
						className="h-8 px-2 text-zinc-100"
						type="button"
						variant="ghost"
						onClick={() => setExpanded((value) => !value)}
					>
						{view.toggleLabel}
					</Button>
				</div>
			) : null}
		</article>
	);
}

function FileChangeTotal({
	additions,
	deletions,
}: {
	additions: number;
	deletions: number;
}): ReactElement {
	const total = formatFileChangeTotal({ additions, deletions });
	return (
		<span className="flex items-center gap-2 tabular-nums">
			<Typography as="span" className="text-emerald-400">
				{total.additions}
			</Typography>
			<Typography as="span" className="text-red-400">
				{total.deletions}
			</Typography>
		</span>
	);
}
```

- [ ] **Step 7: Render the card in the transcript**

Modify `packages/web/src/components/chat-room/chat-transcript.tsx`:

```ts
import { ChatFileChangeSnapshotCard } from "./chat-file-change-snapshot-card";
```

Render it after `ChatSessionActivitySections` and before thinking/planning lines:

```tsx
					<ChatFileChangeSnapshotCard
						snapshot={session?.fileChangeSnapshot ?? null}
					/>
```

- [ ] **Step 8: Run focused web tests**

Run:

```bash
rtk bun test packages/web/tests/chat-file-change-snapshot-state.test.ts packages/web/tests/chat-client.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 6**

```bash
rtk git add packages/web/src/components/chat-room/types/chat-file-change-snapshot.types.ts packages/web/src/components/chat-room/chat-file-change-snapshot-state.ts packages/web/src/components/chat-room/chat-file-change-snapshot-card.tsx packages/web/src/components/chat-room/chat-transcript.tsx packages/web/tests/chat-file-change-snapshot-state.test.ts
rtk git commit -m "feat: show session file change snapshots"
```

---

### Task 7: Validation And Browser Verification

**Files:**
- Verify only unless checks reveal feature-owned failures.

- [ ] **Step 1: Run package checks**

Run:

```bash
rtk bun run --filter devos-db check
rtk bun run --filter devos-db typecheck
rtk bun run --filter devos-db test
rtk bun run --filter devos-server check
rtk bun run --filter devos-server typecheck
rtk bun run --filter devos-server test
rtk bun run --filter devos check
rtk bun run --filter devos typecheck
rtk bun run --filter devos test
rtk bun run --filter web typecheck
rtk bun run --filter web build
```

Expected: PASS. If `web build` fails with sandbox port/process restrictions, rerun it with approved escalation before treating it as a regression.

- [ ] **Step 2: Run root gates**

Run:

```bash
rtk bun run check
rtk bun run typecheck
rtk bun test
```

Expected: PASS, except for explicitly identified pre-existing unrelated dirty-worktree failures.

- [ ] **Step 3: Browser verify the UI**

Start or reuse the web dev server:

```bash
rtk bun run --filter web dev
```

Open the session route in the in-app browser. Use a session seeded with a non-empty `fileChangeSnapshot` or temporarily create one through the database in a local test fixture. Verify:

1. The card renders `Edited N files`.
2. Totals render with green `+A` and red `-D`.
3. Three files render by default.
4. `Show X more files` expands the rows.
5. No text overlaps at desktop width and a narrow mobile viewport.
6. Browser console has no new errors.

- [ ] **Step 4: Check final diff hygiene**

Run:

```bash
rtk git status --short --branch
rtk git diff --check
```

Expected: only feature-owned changes remain after commits, plus the pre-existing unrelated dirty web files that were present before execution.

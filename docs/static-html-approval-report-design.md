# Static HTML Approval Report Design

## Context

Ponytrail already produces a requirement-court Markdown report after a human request has been clarified, reviewed by the role bots, and merged into a detailed requirement. The Markdown report is durable and portable, but it is not optimized for the moment where a human owner must quickly decide whether the plan is safe and clear enough to approve.

This design adds a static HTML approval report as a human review layer. It should be generated beside the Markdown report after brainstorming or writing-plans produces a reviewable plan. It should not replace Markdown or JSON artifacts.

## Goals

- Give the human owner a fast, visual approval packet before implementation begins.
- Make approval criteria, scope boundaries, risks, and evidence easy to scan.
- Preserve the existing CLI-first Ponytrail flow.
- Keep the implementation local, deterministic, and server-free.

## Non-Goals

- Do not build a live dashboard or long-running web app.
- Do not add approval side effects inside the HTML page.
- Do not make HTML the canonical record.
- Do not add a frontend framework or new runtime dependency for the first version.

## Proposed Behavior

When a requirement-court report is written, Ponytrail should also write a self-contained HTML approval report next to it:

```text
.ponyrace/ponyrace/<timestamp>-<title>.md
.ponyrace/ponyrace/<timestamp>-<title>.html
```

The CLI should print both paths when the HTML report is generated:

```text
Markdown report: .ponyrace/ponyrace/<timestamp>-<title>.md
HTML approval report: .ponyrace/ponyrace/<timestamp>-<title>.html
```

Markdown remains the durable text artifact. The HTML page is the review surface for the human approval moment.

## Page Structure

The HTML report should answer the approval questions in this order.

### Should I Approve This?

Show the requirement title, intent, current human confirmation state, and a compact approval-readiness checklist.

The checklist should highlight whether the plan has:

- clear intended change
- clear exclusions
- acceptance criteria
- evidence required
- review-bot approval
- known risks and open questions

### What Exactly Changes?

Show two side-by-side sections:

- Will change
- Will not change

If the include list is empty, fall back to the detailed requirement intent, matching the current Markdown report behavior.

### How Will We Know It Worked?

Show acceptance criteria and evidence required as checklists. These are the main items the owner should mentally validate before allowing implementation.

### What Did The Review Bots Say?

Show one card per role-bot discussion entry. Each card should include:

- display name and bot id
- vote
- confidence
- focus
- concern
- recommendation
- evidence
- required changes
- run metadata

The first version can group by round, matching the existing requirement-court result.

### What Happens Next?

Show a simple static timeline:

```text
brainstorm -> plan -> human approval -> implementation -> verification
```

The current page should emphasize that implementation remains gated until the human owner approves.

## Architecture

Add a runtime renderer beside the existing Markdown report renderer:

```text
src/runtimes/ponytrail/html-report.ts
```

The renderer should export a pure function:

```ts
renderRequirementCourtHtml(result: RequirementCourtResult): string
```

Path generation should mirror the Markdown path helper in `requirement-report.ts`:

```ts
createRequirementCourtHtmlReportPath(rootDir, result, timestamp)
```

The CLI should stay thin. It should call the runtime renderer and write the returned string to disk using the same artifact-writing flow used by the Markdown report.

## Data Flow

```text
RequirementCourtResult
  -> renderRequirementCourtMarkdown
  -> write .md report

RequirementCourtResult
  -> renderRequirementCourtHtml
  -> write .html approval report

CLI output
  -> print both artifact paths
```

The HTML renderer should only read data already present on `RequirementCourtResult`. It should not call worker adapters, rerun review bots, or infer new approval decisions.

## HTML Constraints

- Self-contained HTML with inline CSS.
- No JavaScript required for version one.
- No external assets, CDNs, fonts, or network calls.
- Escape all user- and model-provided text before inserting it into HTML.
- Use semantic sections and readable print-friendly layout.
- Keep the visual design quiet and review-focused.

## Testing

Add focused Bun tests that verify:

- HTML output escapes unsafe text.
- The report includes title, intent, changes, exclusions, acceptance criteria, evidence, risks, open questions, votes, and bot concerns.
- The HTML path helper writes the same timestamp/title stem as the Markdown helper with an `.html` extension.
- CLI artifact output includes the HTML report path when generated.

Run the normal repository gate before claiming completion:

```bash
rtk bun run check
```

For CLI behavior, also run a scratch smoke check that writes the report under `work/`.

## Open Decisions

The first version should generate HTML whenever the Markdown report is generated, because the artifact is local, static, and useful at the same approval point.


# Architecture Decisions (ADR log)

> The permanent home for important "why we chose X over Y" decisions — the ones made
> in discussion that would otherwise vanish (commits log *code*, not *choices*).
>
> Forward-looking entries are allowed: write the decision while it's being made and
> mark **Status** (`Proposed` → `Accepted` / `Rejected` / `Superseded`). Ground every
> claim in something real (a commit, a screenshot, a measured fact) — no fabrication.
> Newest at the bottom.

---

## ADR-001 — Per-session status: how to detect what each pane's Claude is doing

- **Date:** 2026-05-30
- **Status:** Accepted — Option 2 (hooks), maintainer 2026-05-30

### Context
We want a reliable live status per pane — working / needs-you / done — across many
parallel Claude Code sessions. The v1 attempt (commit `04b995e`) scraped Claude Code's
TUI text via the augmentor (`StreamParser`). It is **proven unreliable**: across three
real panes only one showed a strip, and that one was a stale **misparse**
("Yourhomedirectory", from the prose "Your home directory ("). Root cause: Claude Code's
TUI repaints its spinner in place, so status lines never reach a `\n`-based line parser.
Evidence: two screenshots + `docs/troubleshooting.md` ("Per-session live status can't be
scraped…") + `content/logs/dalkkak-ai/2026-05-30-per-session-status-tui-limit.mdx`.

### Options considered

| Option | Touches Claude config? | Cost ($/tokens) | Reliability |
|---|---|---|---|
| **1. Keep tuning TUI patterns** | No | Free | 🔴 Unreliable — the status lines never arrive as parseable lines (not a tuning problem) |
| **2. Claude Code hooks** | Yes (`~/.claude/settings.json`) | **Free** — hooks run a tiny LOCAL command, not an AI call | 🟢 Reliable — Claude emits structured events |
| **3. Process check** | No | Free | 🟡 Reliable but coarse — active/idle only; can't tell needs-you vs done |

**Hooks detail:** Claude emits PreToolUse / PostToolUse / Notification / Stop /
UserPromptSubmit events. Each pane is tagged via a `DALKKAK_PANE_ID` env var we inject
at PTY spawn; a trivial hook command records `{pane, event, tool}` to a local file the
app watches. **No tokens, no money** (this is separate from the later LLM-powered "rich
cards", which *would* cost tokens).

**Hooks costs / downsides (honest):**
1. Edits the user's `~/.claude/settings.json` — mitigated by: back up first, scope to
   DalkkakAI only (guard on `DALKKAK_PANE_ID`), fully reversible (delete the entry).
2. Slight coupling to Claude Code's hook API (may need updating if Claude changes it).
3. The hook command runs on every event — keep it trivial + non-blocking so it never
   slows Claude.
4. A local event file accumulates — needs rotation.
5. Claude-only (other tools' sessions won't emit). Metadata only (tool/ts/pane), no
   code/content, stays local.

### Decision
**Accepted: Option 2 (hooks)** — maintainer chose "추천대로" on 2026-05-30. Free, and the
only option that actually fixes the stale-status flaw. The single real risk (a config
edit) is mitigated by backup + scope (DalkkakAI-only guard) + reversibility. Fallback if
hooks ever prove too fragile: **Option 3 (process check)**.

### Consequences (if hooks)
Build: `DALKKAK_PANE_ID` injection in `pty.rs`; a hook-config installer (with backup +
merge, never overwrite); a Rust receiver (watch the event file) → Tauri event → renderer
wiring into `sessionStatus.ts`. When shipping to other users, the app installs the hook
on first run, with consent.

### Verified (2026-05-31)
Working end-to-end. Evidence: `session-events.jsonl` captured **37 hook events across 3
correctly-tagged panes**; the strip flips `UserPromptSubmit`→thinking, `Stop`→done,
`Notification`→needs-you reliably — the stale-"working" bug is gone (maintainer confirmed
"done으로 바뀜"). **Known gap:** `PreToolUse`/`PostToolUse` fire sparsely (1 PreToolUse in
the sample), so the "working · &lt;tool&gt;" detail is thin — the core states are solid;
tool-name granularity is a future refinement (likely matcher/auto-mode related).

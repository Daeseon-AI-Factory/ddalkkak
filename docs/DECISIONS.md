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

---

## ADR-002 — Layer 2 (rich per-session cards): how to generate the card content

- **Date:** 2026-05-31
- **Status:** Accepted — **A + on-demand** (maintainer "가자")

### Context
Layer 1 (ADR-001) gives a status *label* per session. Layer 2 wants rich cards
(recap / plan / question) — which means SUMMARISING the session into a viz payload.
Who/how generates that is a **cost decision** (the user's tokens), so it's the
maintainer's call.

### Options
| Who generates | Setup | Cost | Quality |
|---|---|---|---|
| **A. user's `claude -p`** (BYO Claude Code) | **none** (already installed) | their Claude plan tokens; slow (~sec) | 🟢 full Claude |
| **B. cheap model (haiku) + API key** | API key | small API spend, separate from plan | 🟡 good (viz-core's pick) |
| **C. deterministic (no LLM)** | none | **free** | 🔴 no plain-language; thin (sparse tool events) |

Trigger axis: **on-demand** (user clicks "✨") = cost fully controlled · **auto** (every
Stop) = always fresh but every-turn cost.

### Decision
**Option A + on-demand.** A "✨ Summarize" button per session → runs the user's
`claude -p` on the session transcript tail → renders a recap/plan card. **Cost only when
clicked**; BYO (their Claude, zero extra setup); aligns with "we don't call AI ourselves
— the user's own Claude does." Auto-trigger and haiku-via-key remain future options if
on-demand proves too manual or `claude -p` too slow/pricey.

### Consequences
The hook must also capture `transcript_path`; a Rust command spawns
`claude -p --output-format json` with a prompt that emits a locked viz payload; the
renderer adds the button + a per-session card surface. For shipping: same mechanism
(every user already has Claude Code).

### Problem found (2026-05-31) — too slow
Built it (commit `753881b`) and measured: the card *content* is good (the
workflow-designed prompt at `prompts/session_summary.md` picks the right kind, plain
language), **but `claude -p` is too slow for an interactive button: ~22–54s** of API
time (`duration_api_ms ≈ duration_ms`, so it's the call not boot; scales with input —
22.9s at 3000 chars, 54.1s at 12000). `--strict-mcp-config` removed the MCP cold-start
but the API time remains. Cause beyond "the call scales with input, abnormally for
haiku" is **unverified** (suspected account rate-limit / subscription throughput /
cache-creation latency). See `docs/troubleshooting.md`.

**Status: superseded by ADR-003** — the maintainer reframed the problem: don't re-read,
self-summarize.

---

## ADR-003 — Layer 2 fast path: in-line self-summary, not post-hoc re-read

- **Date:** 2026-05-31
- **Status:** Accepted + VALIDATED (maintainer's idea)

### Context
ADR-002 spawned a *separate* `claude -p` that **re-reads the whole transcript** with a
fresh model → ~22–54s, because a second model re-does the work and (at the user's
`effortLevel: high`) thinks for thousands of tokens. Not MCP, not boot, not money (it
runs on the subscription) — it's a redundant re-read. The maintainer's reframe: the
session's OWN Claude already did the work and holds all the context — have **it** emit
the summary as a byproduct of its response.

### Decision
Inject a directive via **`--append-system-prompt`** (scoped to DalkkakAI panes) so the
pane's Claude appends `<dk-summary>{viz json}</dk-summary>` at the end of each response.
The app captures that block from the PTY stream, **strips it from the terminal display**,
and renders the card. The doer summarizes itself.

### Validated (2026-05-31)
`claude -p "List my home dir" --append-system-prompt "<directive>" --model
claude-haiku-4-5 --strict-mcp-config` reliably appended a valid, accurate block:
`<dk-summary>{"kind":"recap","data":{"headline":"Listed home directory contents",...}}</dk-summary>`.
**Free** (part of the reply), **instant** (no separate call), **accurate** (full context).
Kills the 22–54s problem entirely.

### Consequences (build)
- `pty.rs`: prepend a DalkkakAI-only `claude` wrapper on PATH that adds
  `--append-system-prompt "<directive>"` — so it only affects sessions started in
  DalkkakAI, not the user's Claude elsewhere.
- Stream parser (`terminalRegistry`/augmentor): detect + extract + **strip**
  `<dk-summary>…</dk-summary>` (buffer across chunks) → drive a per-session card.
- The reusable summarizer prompt (`prompts/session_summary.md`) becomes the directive
  content (compact form).
- The ✨ on-demand `claude -p` (ADR-002) drops to a fallback / is removed.
- Tradeoffs: adds a few tokens to each pane reply (free, subscription); the model must
  remember the block (high but not 100% — a missed turn just yields no card, graceful).

### Built (2026-05-31), commit `fad4738`
- **Injection pivot:** the first plan (prepend a DalkkakAI `bin` dir holding a `claude`
  wrapper to the pane PATH) was **bypassed** — the user's `~/.zshrc` does
  `export PATH="$HOME/.local/bin:$PATH"`, which prepends the dir holding the REAL claude
  *ahead* of our wrapper. So we switched to a guarded **shell FUNCTION** (`claude() {
  command claude --append-system-prompt … }`) — functions resolve before PATH, so it wins
  regardless of rc ordering. (See `docs/troubleshooting.md`.)
- **The app installs it safely** (`inline::ensure_shell_function`): **append-only** (never
  reads-for-rewrite or parses the user's file → existing content cannot be corrupted, only
  added to), **backed up** once to `~/.zshrc.dalkkak-bak`, **idempotent** (marker), and
  **guarded by `DALKKAK_PANE_ID`** so it acts only in DalkkakAI panes.
- **Consent + safety:** a direct shell edit of `~/.zshrc` was (correctly) blocked by the
  auto-mode classifier as an unrequested shell-profile change. The maintainer then
  explicitly approved ("확실히 해줘.. 절대 꼬이면 안되"), so the **app** performs it — the
  proper, consented mechanism, not an ad-hoc edit.
- **Verified:** existing `.zshrc` byte-identical after install (append-only confirmed);
  backup present; `claude` is a function in DalkkakAI panes and the real binary in normal
  terminals; no crash. Live card render pending the maintainer's in-app confirm.

### Problem found (2026-05-31) — capture from the stream is unreliable; read the transcript
Live test in interactive panes: the model **does** emit a clean `<dk-summary>{json}</dk-summary>`
(verified in the transcript JSONL), but the in-app result is wrong — the **raw JSON leaks
into the terminal** and the **card is empty**. Root cause: we capture + strip from the
**interactive TUI byte stream**, which Claude Code mangles (markup-handling of the
angle-bracket tags + cursor-redraws/ANSI), so `SummaryStripper` misses. **This is the exact
wall ADR-001 already taught us** (TUI scraping is unreliable → use structured channels) —
re-hit here for capture. **Next (ADR-004?):** read the latest `<dk-summary>` from the
**transcript file** (`transcript_path`, which the Stop hook already provides), not the
xterm stream. Hiding the block from the visible TUI is the remaining open question. The
self-summary *idea* (ADR-003) stands; only the capture *transport* needs to move from
stream → transcript. See `docs/troubleshooting.md`.

---

## ADR-004 — Read the in-line summary card from the TRANSCRIPT, not the TUI stream

**Status:** Accepted + Built (2026-05-31)
**Supersedes:** the *capture transport* of ADR-003 (stream-strip). ADR-003's self-summary
*idea* is unchanged — the model still emits `<dk-summary>{viz}</dk-summary>` into each reply.

**Decision.** Stop trying to intercept/strip the block from the interactive xterm byte
stream. Instead, when the user clicks ✨, read the session **transcript JSONL**
(`transcript_path`, already handed to us by the Stop hook) from the end, find the last
assistant text block containing a `<dk-summary>` block, and render its `{kind,data}`.
Implemented as the Rust command `read_inline_summary` (`summarize.rs::extract_block`).

**Why.** The transcript stores the model's text **un-mangled** (no ANSI/cursor-redraw),
so a literal `<dk-summary>` match works every time. It's also **instant** (a file read, no
model call) and **free** — no `claude -p`, no API time (kills the ADR-002 latency problem
too). This is ADR-001's lesson applied a third time: read Claude's structured channels
(hooks, transcript), never the rendered TUI.

**Accepted tradeoff — the block leaks into the visible pane.** A model can only write into
its own response, so the `<dk-summary>` JSON is visible at the end of each reply. We tried
to hide it (stream-strip) and that's the unreliable part — so we **dropped the stripper**
(`terminalRegistry.ts` writes raw PTY bytes to xterm) and **accept the leak**. The
maintainer signed off: "JSON이 화면에 뜨는 거 자체는 그럴 수 있을 것 같은데." A line of JSON
at the bottom of a reply is acceptable; an empty/garbled card was not.

**Result (built + installed 2026-05-31).** Card renders reliably (incl. a new `note`
renderer, `NoteCard.tsx`) in a **centered portal popup** (`SummaryModal.tsx`, escapes the
Mosaic tile's containing block) with the source pane outlined red. The popup also shows
**per-session token usage** summed from the same transcript (`session_usage`) — real
input/output/cache numbers, **no $** (a Max subscription has no per-token bill and the
transcript has no `costUSD` field, so a dollar figure would be fabricated). See
`docs/troubleshooting.md`.

---

## ADR-005 — Usage metrics are a read-time "pulse", not a stored telemetry pipeline

**Status:** Accepted + **P0 Built** (2026-05-31) — design locked; six open questions resolved;
all 6 views shipped in the 📈 Pulse tab. Commit `e34790b`.
**Full spec:** [`docs/USAGE_PULSE.md`](USAGE_PULSE.md).

**Context.** Jason asked for per-startup / daily usage metrics AND logging of the internal
agent-loop steps ("to use AI better"), explicitly "not too detailed", on a subscription with no
$ bill. Designed via a 3-draft → adversarial-critique → synthesis workflow (7 agents) that read
the actual code and verified each reuse claim at line level.

**Decision.** Build a **read-time pulse**, not a metrics product:
- A single pure Rust fn `usage_pulse()` (sibling of `summarize.rs::session_usage`) rolls metrics
  **on view-open** from data already on disk — native transcripts + the already-tailed
  `session-events.jsonl` + `GraphStore` — and **persists nothing in Phase 1**.
- Honest units only: **output tokens + active days + counts**; never total/cache tokens, never `$`.
  Enforced by a **single output-tokens accessor** so the 305M:1.6M cache_read trap can't be wired
  in by accident.
- Logged signals are **counts & enums only** (tool_name, is_error boolean, step/turn/block counts) —
  never tool inputs, paths, commands, content, or error text (CLAUDE.md security).
- Startup attribution keys on the **transcript's own recorded `cwd`** (longest-prefix-wins over
  `PathAllowlist`, ambiguity → `unassigned`) — works on historical sessions day one, never
  confidently-wrong.
- Six glanceable views (effort split / momentum / fan-out / explore-vs-produce / friction /
  shipped-vs-thrash), each tied to a real founder decision.

**Why over the alternatives.** A persisted-events pipeline (Tier 1/2) was deferred behind explicit,
falsifiable triggers (P1 only if on-read re-parse measurably >~300ms or a transcript rotates away;
P2 only when a reader consumes it). Tool-mix/retry/block were re-sourced from the **transcript**,
not hooks, because the product's PreToolUse/PostToolUse hooks fire sparsely (measured ~1 in 37
events) and the PostToolUse hook drops `tool_response` — so a hook-based count would be near-empty.

**Resolved (2026-05-31, design lock).** active-day = any hook event OR commit (commits also tracked
separately); `unassigned` shown as a visible row; steps/turn = descriptive trend only, no score;
tool_error = raw counts labelled "includes expected"; timezone = local Toronto; hook `cwd` not
needed for P0 (transcript `cwd` attributes day one). Code: P0 (`usage_pulse()` + views) is the next
build step, pending Jason's go + scope.

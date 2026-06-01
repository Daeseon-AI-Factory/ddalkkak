# DalkkakAI — Usage Pulse (spec)

> **Status:** Accepted (2026-05-31). Design locked — the six open questions are resolved
> below. Code: P0 not yet built. Designed via a 3-draft → adversarial-critique → synthesis
> workflow (7 agents) that verified every reuse claim against the actual code.
> See `docs/DECISIONS.md` ADR-005.

## Philosophy — "pulse, not telemetry"

A **glanceable pulse** for a solo founder running multiple startups, NOT a metrics product.
It answers a handful of "where is my AI effort going / where does it stall" questions and
**stops there**. Hard rules (locked, from prior decisions):

- **No dollars, ever.** Max subscription → no per-token bill, transcripts have no `costUSD`.
  A `$` would be fabricated. Tokens are shown as **effort/activity**, never spend.
- **Effort unit = OUTPUT tokens + active days + turn/step counts.** NEVER raw total tokens:
  `cache_read` is just re-reads of the growing context (measured ~305M cache vs ~1.6M output) —
  real but pure noise as effort. Enforced structurally (see *single output-tokens accessor*).
- **Cheap by default.** Phase 1 persists **nothing** — it rolls up data we already have on read.
- **Counts & enums only.** Never log tool inputs, paths, commands, edit content, prompt text,
  or error bodies (CLAUDE.md security). `tool_name` is an enum; `is_error` is a boolean.

## Architecture

One pure Rust fn **`usage_pulse()`** — a sibling of `summarize.rs::session_usage` — that, on
view-open, reads two sources already on disk and returns rollups, **writing nothing**:

1. **Native transcripts** (path from the hook line's `tpath` / Stop event's `transcript_path`):
   output_tokens, agent steps, turns, tool-mix, tool-errors. `session_usage` already does the
   token half on read; reuses `is_user_prompt()` for turn segmentation.
2. **`<data_dir>/DalkkakAI/session-events.jsonl`** (already tailed by `hooks.rs`): turn_count,
   block_count, active_day.
3. **`GraphStore.read_all()`** (`capture.rs`): commit_count for shipped-vs-thrash.

### Single output-tokens accessor (architectural rule)

Every effort rollup MUST go through ONE accessor that returns `output_tokens` only.
`input` / `cache_read` / `cache_creation` stay quarantined in a counts-only debug object and
**never feed a view**. This makes the cache_read-dominance trap impossible to wire in by accident.

### Startup attribution

- **Primary key = the transcript's own recorded `cwd`**, matched against `PathAllowlist` via
  **longest-prefix-wins** over `snapshot()` (`paths.rs`). Longest match wins (most-specific
  startup); a tie or no match → **`unassigned`** (never guess, never drop).
- This fixes both (a) **cold-start** — `cwd` is in every transcript today, so historical
  sessions attribute from day one (the hook line has no `cwd` and its tail starts at EOF, so a
  hook-based key couldn't backfill); and (b) **silent misattribution** — bare prefix-matching
  confidently tags the wrong startup on nested roots.
- **Secondary (live only)** = pane→startup from the renderer layout, for the active startup only.

### Hook vs transcript reliability (stated honestly)

Transcript-sourced fields (output_tokens, turns, steps, tool-mix, tool-errors) are **durable &
complete**. Hook-sourced fields (block_count, turn_count) are **best-effort & nullable** — the
hook tail starts at EOF and never replays, so a missed/closed window under-reports them. Views
degrade gracefully (`-` / `approx`, never crash, never silently zero a real value).

## Signals to log

| Signal | Source | Answers |
|---|---|---|
| **turn_boundary** (the denominator) | transcript | the unit everything normalizes by; reuses `is_user_prompt()` |
| **steps_per_turn** (fan-out) | derived | "are my asks well-scoped?" — the 47-steps-per-turn insight, made visible |
| **output_tokens_rollup** (effort) | transcript | the only honest effort headline, bucketed by startup + day |
| **tool_mix** (explore-vs-produce) | transcript | "is AI reading/searching or editing/running?" enum→count map |
| **tool_error_count** (thrash) | transcript | "where did the loop stall on failed tools?" `is_error` count by tool |
| **block_count** (waited-on-me) | hooks | "where does AI keep waiting on ME?" reliable `Notification` count |
| **turn_count** (engagement) | hooks | "how many real questions today, per startup?" zero-parse proxy |
| **active_day** (momentum) | derived | "which startup went dark?" DISTINCT(startup, day) |
| **shipped_vs_thrash** | git capture | "did activity turn into commits, or churn?" turns vs commits |

**Deliberately NOT logged:** raw/total/input/cache tokens as effort; any `$`; tool inputs
(paths/cmds/content/error text); per-keystroke PTY metrics; per-call latency/timing histograms;
wait-on-user *duration* as a headline (no "unblocked" event → unreliable); per-message model name
(cost-adjacent); assistant message text/embeddings; per-step persisted rows (durable grain is the
**day**, never the step).

## Views

| View | Question | Unit |
|---|---|---|
| **Effort split** (portfolio bar) | Where is my AI effort going across startups? | output tokens/startup/week (turn_count fallback); labelled "effort", never "value" |
| **Momentum / went-dark** | Which startup haven't I moved lately? | active days in last 14 + days-since-active (NOT tokens) |
| **Fan-out / scope meter** | Are my asks well-scoped? | steps/turn, trended vs *this startup's own* baseline (descriptive, not a score) |
| **Explore-vs-produce** | Reading/searching or editing/running? | tool counts by enum |
| **Friction strip** | Waiting on me, or thrashing on failed tools? | block count (lead) + tool_error by tool; any duration marked "approx" |
| **Shipped-vs-thrash** | Did activity become commits? | turns vs commits/startup/day |

## Phasing

| Phase | Scope | Trigger |
|---|---|---|
| **P0 — Read-time pulse** | `usage_pulse()` + a `session_pulse` Tauri command; parse transcripts (OUTPUT only) + session-events + GraphStore into the views. **Zero new storage.** Ship reliable-data views first (momentum, shipped-vs-thrash, fan-out). | **NOW** — all inputs verified in-tree. |
| **P1 — Thin daily index** | Materialize a **disposable, rebuildable** `pulse/<startup_id>.jsonl`, one finalized line per (startup, day), using GraphStore's append-distinct-by-`record_id` pattern (NOT last-write-wins). Unlocks 30-day sparklines surviving a rotated transcript. | **ONLY** when on-read re-parse measurably exceeds ~300ms to open a view, OR a needed transcript was rotated away. Measure first. |
| **P2 — Durable metric node** | Weekly `node_type:'metric'` node into GraphStore so pulse history joins the connective graph / advisor. | **ONLY** when the cross-startup dashboard/advisor actually consumes it. |

## Risks

- **Cold-start (mitigated):** hook-sourced fields can't backfill (tail starts at EOF) → the
  friction/block strip "starts now"; show an honest empty state. Transcript-cwd attribution still
  populates effort/momentum/fan-out/shipped from existing transcripts, so the pulse isn't blank.
- **Shared-monorepo attribution:** two startups under ONE granted root can't be split by `cwd`;
  they pool onto the owning startup. Coarse but never confidently-wrong (`unassigned` on ambiguity).
- **Transcript-format coupling:** `message.usage` / `tool_result.is_error` / `cwd` are Claude
  Code's native shape, not a public contract. Tolerate-missing-fields everywhere; degrade to the
  coarser hook-only views rather than breaking.
- **tool_error cry-wolf:** `is_error:true` conflates broken setup with healthy expected errors
  (grep-no-match, handled file-not-found). Bucket by tool + exclude cheap expected cases; flag
  only sustained per-startup outliers.
- **steps_per_turn is noisy:** a 47-step turn can be a perfectly good ask. Frame as descriptive
  trend vs own baseline, never "prompt quality."
- **On-read cost is O(transcript size):** acceptable at P0; the ~300ms trigger guards P1.
- **Scope creep is THE biggest risk:** every phase past P0 must clear an explicit, falsifiable
  trigger. Additions require a named "use AI better" question first.

## Resolved decisions (design locked, 2026-05-31)

The six open questions, resolved on honest/cheap defaults (Jason to override any):

1. **'active day'** = **any hook event OR any commit** marks a startup active that day. Commits are
   ALSO tracked separately (they feed shipped-vs-thrash). So a day of pure exploring still reads as
   "active"; whether it *shipped* is a different view, not a demotion to "inactive".
2. **'unassigned'** = **shown as a visible row** in the effort split (honest about coverage gaps,
   never hidden). Shared-monorepo pooling (two startups under one granted root → the owning startup)
   is **accepted for v1**; a per-pane startup tag is a later refinement, not P0.
3. **steps_per_turn** = **purely descriptive trend** vs this startup's own baseline. **No score, no
   "prompt quality", no nudge** — zero judgment (a 47-step turn can be a perfectly good ask).
4. **tool_error** = v1 shows **raw `is_error` counts, labelled "includes routine/expected errors"**.
   The expected-error exclusion heuristic is a later refinement, not P0.
5. **Timezone** = **local (Toronto) tz**, midnight/DST/travel smear accepted and documented. Fine
   for a day-grained pulse.
6. **Hook line shape** = **not needed for P0** — attribution uses the transcript's `cwd`, so the
   pulse works day one with no hook change. Adding `cwd`/`ts` to the product hook is a P1+ option.

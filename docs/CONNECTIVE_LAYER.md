# DalkkakAI — Connective Layer v0 ("commits-first")

> Implementation spec for the connective layer described in [BLUEPRINT.md §5.5](BLUEPRINT.md).
> Designed, then adversarially verified against all 4 hard constraints — **4/4 pass (2026-05-30)** —
> then built. Status: **building**.

## What v0 does (one paragraph)

Each startup gets a **confirmed project folder** (the user picks it once via a folder picker).
DalkkakAI watches **only that folder** and captures **git commits** made there — *post-hoc, off
the terminal's render path, on a 20s timer* — into append-only JSONL `change` nodes
(`provenance: confirmed`, deterministic `node_id = <startup>/change/<hash>`). A single validator
rejects any malformed record. A cross-startup list renders the nodes. The terminal code, registry
keying, and tmux session naming are **not touched**.

## The four components

1. **Path-grant primitive** — `Startup.grant` (optional, backward-compatible) set via a folder
   picker; a single Rust `PathAllowlist` chokepoint canonicalizes + symlink-resolves and
   HARD-REFUSES any ungranted path (never falls back to `$HOME`). No Full Disk Access; only
   `tauri-plugin-dialog` (open-directory).
2. **Capture** — `capture.rs`: a 20s `tokio` timer task shells out to `git -C <granted root>`
   (read-only; never takes `.git/index.lock`), parses commits → `change` nodes. Never reads a PTY
   byte; structurally off the render/PTY threads.
3. **Schema + validator** — `packages/shared/src/{graph,validate}.ts`: the locked, versioned
   `GraphNode` + `validateNode`. Migration policy: additive-only fields, readers tolerate unknown
   fields, version-dispatch on read, never rewrite old records, `node_id` is the eternal join key.
4. **Read surface** — `GraphPanel.tsx`: cross-startup list with a provenance badge.

## How the 3 prior violations are resolved

- **Don't distort work:** capture is a timer task off the render path; no terminal code touched;
  no "seal turn"; no human grooming (every v0 node is confirmed git data).
- **Consumer security:** real per-startup path grant + single Rust allowlist chokepoint; never
  `$HOME`; no OS-wide permission asks.
- **Locked / joinable / honest standard:** git commits → `change` nodes the data can fill;
  confirmed provenance with an evidence receipt; deterministic `node_id`; stated migration policy;
  single ingest validator rejects empty/fabricated nodes.

## Build slice (6 new files, 5 edits)

New: `packages/shared/src/graph.ts`, `validate.ts`; `apps/desktop/src/pathGrant.ts`,
`GraphPanel.tsx`; `apps/desktop/src-tauri/src/paths.rs`, `capture.rs`.
Edit: `startups.ts`, `App.tsx`, `lib.rs`, `Cargo.toml`, `apps/desktop/package.json`.

## Founder decisions (defaults chosen for v0, tune later)

20s poll + `--since=72h` backfill · storage in app-data (`graph/<startup>.jsonl`) · current-branch
only · capture all commits in the granted repo · grant revocation available · raw `change` nodes
(no inferred structure/flow roll-up in v0).

## Out of v0 scope

Cloud/Postgres · external metric PULL (Stripe/uptime) · fs/notify watcher · the Tier-2 seal turn /
observer agent · viz/advisor · inferred structure/flow/issue nodes.

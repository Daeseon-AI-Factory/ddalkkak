# CLAUDE.md — DalkkakAI v2 (Agent Rules)

> AI agents working in this repo MUST read this file first.
> v1 rules at `old_repo/CLAUDE.md` (legacy, do not apply to v2 code).

---

## Project identity

DalkkakAI is a **lightweight native multi-pane terminal multiplexer + Claude Code augmentation platform** (Tauri-based desktop app) for solo indie hackers running multiple startups.

**Canonical reference:** [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md).

**Critical principle:** We do NOT call AI ourselves. Users bring their own Claude Code/Codex (BYO). Our product is the workspace, not the LLM.

---

## RULE #1 — Stack lock-in

- **Frontend (Tauri renderer):** TypeScript (Vite + React + xterm.js + react-mosaic + Tailwind + shadcn/ui)
- **Desktop runtime:** Tauri 2.x
- **Local backend:** Rust (portable-pty, tokio, tokio::process, git2/git subprocess, serde, tauri 2.x)
- **Cloud backend (Phase 1.4+):** TypeScript (Node.js 22 + Hono on Fly.io)
- **DB / Auth:** Supabase (Postgres + Supabase Auth via tauri-plugin-oauth)
- **Monorepo:** pnpm workspaces

**Allowed languages: TypeScript + Rust** (Tauri requirement).
Do NOT introduce Python, Go, Java, or other languages into this repo.

---

## RULE #2 — Read BLUEPRINT.md before architectural decisions

If a decision isn't covered there, surface it for the maintainer (Jason).

---

## RULE #3 — Verify before claiming done

- Rust backend change → `cargo check` + `pnpm tauri dev` opens and works
- Frontend change → `pnpm build` must pass (production build)
- PTY change → spawn, write, read, resize, kill — verify all four
- Tauri command/event change → invoke from renderer and confirm round-trip

---

## RULE #4 — `old_repo/` is read-only

Reference only. Do not modify, extend, or import from `old_repo/`.

---

## RULE #5 — Tauri patterns

- **Frontend ↔ Rust IPC:** `tauri::command` (renderer calls Rust functions)
- **Rust → Frontend events:** `tauri::Window::emit` (stream data like PTY output)
- **Async Rust:** Tokio everywhere. Never block the Tauri main thread.
- **Long-running tasks:** Spawn into `tokio::spawn`, store handle in app state
- **App state:** `tauri::State<T>` with `Arc<Mutex<T>>` or `Arc<RwLock<T>>`
- **Errors:** Return `Result<T, String>` from commands (Tauri serializes both arms)

---

## RULE #5b — Subprocess env hygiene (added 2026-05-26, extended 2026-05-26)

When spawning **any** subprocess in a Tauri (or any GUI desktop) app, never assume inherited environment is sufficient. Always:

- Explicitly set `TERM=xterm-256color` and `COLORTERM=truecolor`.
- Forward common interactive-shell vars: `HOME`, `USER`, `LOGNAME`, `LANG`, `LC_ALL`, `LC_CTYPE`, `TZ`, `SHELL`, `PWD`, `TMPDIR`.
- **For PATH specifically: *augment*, not just forward.** Prepend `/opt/homebrew/bin:/usr/local/bin` so Homebrew-installed binaries (tmux, claude, etc.) resolve. The Tauri GUI app's inherited PATH may be minimal.
- Set sensible `cwd` (default `$HOME` for terminal panes; per-worktree for project panes later).
- Guard pathological PTY sizes (`cols=0`/`rows=0`) with a fallback (80×24).

A "minimal shell" inside a GUI bundle is a different beast from a shell in iTerm. See `docs/ISSUES.md` 2026-05-26 entries for two prior post-mortems on this class.

---

## RULE #5c — Spawn pattern: wrap fallible binaries (added 2026-05-26)

Any subprocess that **can fail** must be wrapped with a **visible error path**. Bare `CommandBuilder::new("tmux")` style spawns silently die if PATH resolution fails or the binary errors out — the user just sees a blank pane.

Template:
```bash
/bin/bash -c "$cmd 2>&1; status=$?; if [ $status -ne 0 ]; then echo 'failed (exit '$status')'; fi; exec ${SHELL:-/bin/bash}"
```

Effects:
- bash takes over PATH resolution and error reporting
- non-zero exits surface as readable text in the pane
- a fallback shell prompt lets the user debug interactively (`tmux ls`, `which tmux`, etc.)

---

## RULE #5d — PTY EOF must be visible (added 2026-05-26)

When a PTY's `read()` returns `Ok(0)` (EOF), the renderer must receive a **visible marker** before the stream closes — e.g., `\x1b[33m[pane <id> closed]\x1b[0m` in yellow.

Frozen-pane-with-no-output is the worst possible UX: the user can't tell whether the pane died, is hung, or is just slow. Always emit *something* on close.

---

## RULE #6 — Issues are assets

**Every** bug, friction, surprise, or fix MUST get a `docs/ISSUES.md` entry with all 6 required sections (symptom / root cause / fix / instruction-at-fault analysis / avoidability / lessons). **Patching and moving on is forbidden — analyze.**

These entries are studied later for code reviews, Amazon SDE II interviews (failure analysis is half of system design), dogfooding pattern recognition, AI-pair-coding prompt improvement.

If a fix yields a permanent rule, also append it to this file under the right rule number.

---

## RULE #7 — Append to `MILESTONES.md` after every task / major decision

Three tones every time (🔧 Engineering / 💬 Raw / 📣 Marketing). Same step is reusable for different audiences later.

---

## Code standards

- TypeScript everywhere (renderer), `strict: true`
- Rust everywhere (Tauri backend), `clippy` clean, `rustfmt` enforced
- Biome for TS lint + format
- No `any` (without a comment explaining why)
- Files: ~300 lines max, split before
- Tests: Vitest (TS), `cargo test` (Rust)

---

## API contract (cloud backend)

```
Success: { ok: true, data: ... }
Error:   { ok: false, error: "Human message", code: "SNAKE_CODE" }
IDs: UUID v7. Timestamps: ISO 8601 UTC. Auth: Supabase JWT in Authorization header.
```

---

## Communication patterns

- Renderer ↔ Local Rust backend: Tauri commands + events
- Renderer ↔ Cloud backend: HTTPS REST (Phase 1.4+)
- Cloud backend ↔ Java platform: REST + OpenAPI-generated TS client — gRPC in Phase 2+
- Cloud backend ↔ DB: Prisma ORM

---

## Security

- Never log: passwords, tokens, API keys, PII
- Never commit: `.env`
- Tauri allowlist (`tauri.conf.json`): restrict to commands actually used; don't enable broad fs/shell allowlist
- Validate user input at boundaries
- Rate limit: handled by Java platform

---

## RULE #8 — Two-layer logging (added 2026-05-26)

**Layer 1 — Claude Code hooks** (`.claude/settings.json`): every Bash, Edit/Write, UserPromptSubmit, and Stop event is auto-logged to `logs/{actions,edits,prompts,sessions}.jsonl`. These are git-ignored raw logs; use them as raw material when writing `docs/ISSUES.md` post-mortems or `docs/MILESTONES.md` 3-tone entries.

**Layer 2 — Product runtime tracing** (Rust `tracing` + `tracing-appender`): every meaningful PTY lifecycle event (spawn, kill, EOF, read error, emit failure) and Tauri command invocation is logged to `~/Library/Logs/DalkkakAI/runtime.log.YYYY-MM-DD` (daily rolling).

When debugging a user-reported issue:
1. Ask for the latest `runtime.log` (Layer 2) — gives the exact event sequence on their machine.
2. Cross-reference with `logs/*.jsonl` (Layer 1) if it's a dev-time issue.
3. Add an entry to `docs/ISSUES.md` with the relevant log snippets quoted in section 2 (root cause).

When making a new architectural decision in this session: check `logs/prompts.jsonl` for the prompt that drove it (raw material for the post-mortem's prompt-quality blame section).

Never log: passwords, tokens, API keys, PII. tracing macros accept structured fields — use them for IDs and counts, not for raw user input.


## Project log (required, dual-write)

When you fix or decide something non-trivial in this repo, write BOTH of these in the same turn as the commit:

1. `docs/troubleshooting.md` — terse problem-indexed reference (Symptom / Cause / Fix / Commit / Pattern). Append a new entry below the `---` divider.
2. `content/logs/dalkkak-ai/<YYYY-MM-DD>-<short-slug>.mdx` — dated narrative with frontmatter:

```yaml
---
title: "Concrete one-line title"
date: "YYYY-MM-DD"          # ALWAYS quoted! unquoted ISO date is parsed as a
                            # Date object by js-yaml and breaks the blog build.
project: "dalkkak-ai"       # slug locked-in — matches blog's content/projects/en/dalkkak-ai.mdx
kind: "troubleshoot | tech-retro | ux-retro | business | monetization | update"
visibility: "public | unlisted | private"
language: "en"
summary: "One or two sentences."
tags: ["topic", "stack"]
---
```

### What counts as non-trivial

LOG IT: build/deploy errors, hidden coupling, dependency migrations, architecture or infra decisions, design/copy choices made on judgment, strategy or pricing memos.

DON'T LOG: routine renames, lint fixes, typo fixes, dependency bumps with no behavior change, formatting commits.

### Anti-hallucination rules (non-negotiable)

1. **Symptom is literal.** Paste the actual error/output in a fenced code block. No paraphrasing.
2. **Cause is verified.** Only state what you read in the actual code or ran in the actual command. If you guessed, write `Hypothesis: ...` and `Verified by: ...`. If unverifiable, omit Cause or mark `Suspected:` with an explicit caveat.
3. **Fix names actual files.** `git diff` is the source of truth. If `git diff` doesn't show the change, don't claim you made it.
4. **Commit hash AFTER committing.** Use `git rev-parse HEAD` after the commit lands. Never write a hash that doesn't exist yet.
5. **Date from git.** `git log -1 --format=%cI` for the commit time. For forward-looking entries (decisions being written in the moment), today's date from the session start. Never guess.
6. **Pattern is rare.** Only write a Pattern line if a recurring lesson is obvious from this one incident. Padding it with generic advice is worse than omitting.
7. **No fabricated metrics.** "Took about 60s" if you saw 60s. "Took 1m 23s exactly" only if you have the timestamp.

### Visibility defaults by kind

- `business`, `monetization` → `private` by default (strategy memos shouldn't ship accidentally)
- `knowledge`-style facts → `unlisted` if you have such a type
- Everything else → `public`

Override per entry in frontmatter.

### Skip rule for routine commits

The Stop hook blocks the turn until the most recent commit is either logged OR explicitly marked routine. To skip without writing an entry:

- Option A — put `[no-log]` (or `[skip-log]`) anywhere in the commit message. The hook auto-appends a `<!-- skipped: <hash> <subject> -->` line to `docs/troubleshooting.md` so it stops firing.
- Option B — append the same `<!-- skipped: <hash> <subject> -->` line yourself, then commit. Same effect.

Routine = typo fix, lint fix, formatting commit, dep bump without behavior change, file rename. Anything else: write the entry.

---

## RULE #9 — Cross-repo blog log slug (added 2026-05-27)

This repo is a **satellite of the `daseon-blog` cross-repo log aggregator** at <https://daeseon.ai>. The blog fetches `content/logs/dalkkak-ai/*.mdx` from this repo and renders them on the project timeline.

**Slug for this repo (locked-in, do NOT re-detect): `dalkkak-ai`**
Auto-detected by matching this repo's origin URL (`Daeseon-AI-Factory/ddalkkak`) against the `repo:` field of `content/projects/en/dalkkak-ai.mdx` in `daseon-blog`.

This RULE only locks the slug. **Dual-write protocol, anti-hallucination rules, visibility defaults, and Stop-hook skip behavior live in the "Project log" section above (right after RULE #8). Follow that section verbatim — this one just pins the slug.**

After pushing, the blog auto-refreshes the timeline at `https://daeseon.ai/projects/dalkkak-ai/` within ~30 seconds.

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

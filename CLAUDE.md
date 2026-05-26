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
Do NOT introduce Python, Go, Java, or other languages into this repo. (Separate Java platform repo handles billing/rate-limit; consumed via REST.)

---

## RULE #2 — Read BLUEPRINT.md before architectural decisions

If a decision isn't covered there, surface it for the maintainer (Jason).

---

## RULE #3 — Verify before claiming done

- Rust backend change → `cargo test` + `pnpm tauri dev` opens and works
- Frontend change → `pnpm build` must pass (production build)
- PTY change → spawn, write, read, resize, kill — verify all four
- Tauri command/event change → invoke from renderer and confirm round-trip

---

## RULE #4 — old_repo/ is read-only

Reference only. Do not modify, extend, or import from `old_repo/`.

---

## RULE #5 — Tauri patterns

- **Frontend ↔ Rust IPC:** `tauri::command` (renderer calls Rust functions)
- **Rust → Frontend events:** `tauri::Window::emit` (stream data like PTY output)
- **Async Rust:** Tokio everywhere. Never block the Tauri main thread.
- **Long-running tasks:** Spawn into `tokio::spawn`, store handle in app state
- **App state:** `tauri::State<T>` with `Arc<Mutex<T>>` or `Arc<RwLock<T>>`
- **Errors:** Return `Result<T, String>` from commands (Tauri serializes both arms)
- **Cargo features:** Keep `src-tauri/Cargo.toml` lean; don't pull `tokio/full` if a subset works

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

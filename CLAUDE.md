# CLAUDE.md — DalkkakAI v2 (Agent Rules)

> AI agents working in this repo MUST read this file first.
> v1 rules are at `old_repo/CLAUDE.md` (legacy, do not apply to v2 code).

---

## Project identity

DalkkakAI is a **cloud-native multi-pane terminal multiplexer + Claude Code augmentation platform** for solo indie hackers running multiple startups.

**Canonical reference:** [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md).

**Critical principle:** We do NOT call AI ourselves. Users bring their own Claude Code/Codex (BYO). Our product is the workspace, not the LLM.

---

## RULE #1 — Stack lock-in

- **Backend:** Node.js 22 + TypeScript + Hono + node-pty + ws
- **Frontend:** Vite + React + TypeScript + xterm.js + react-mosaic + Tailwind + shadcn/ui
- **DB / Auth:** Supabase (Postgres + Supabase Auth)
- **Deploy:** Fly.io
- **Monorepo:** pnpm workspaces

Do NOT introduce Python, Go, or Java into this repo. (The separate Java platform repo handles billing/rate-limit; consumed via REST.)

---

## RULE #2 — Read BLUEPRINT.md before architectural decisions

If a decision isn't covered there, surface it for the maintainer (Jason).

---

## RULE #3 — Verify before claiming done

- Backend change → curl the endpoint, paste response
- Frontend change → `pnpm build` must pass (production build, not just dev)
- WebSocket change → connect and exchange a message
- DB change → query and verify

---

## RULE #4 — old_repo/ is read-only

Reference only. Do not modify, extend, or import from `old_repo/`.

---

## Code standards

- TypeScript everywhere, `strict: true`
- Biome for linting + formatting
- No `any` (without a comment explaining why)
- Files: ~300 lines max, split before that
- Tests: Vitest unit, Playwright e2e

---

## API contract

```
Success: { ok: true, data: ... }
Error:   { ok: false, error: "Human message", code: "SNAKE_CODE" }
IDs: UUID v7. Timestamps: ISO 8601 UTC. Auth: Supabase JWT in Authorization header.
```

---

## Communication patterns

- Frontend ↔ Backend: REST (JSON) + WebSocket (PTY stream)
- Backend ↔ Java platform: REST + OpenAPI-generated TS client (`packages/platform-client`) — gRPC in Phase 2+
- Backend ↔ DB: Prisma ORM

---

## Security

- Never log: passwords, tokens, API keys, PII
- Never commit: `.env` files
- Validate user input at boundaries (Zod or Hono validators)
- CORS: whitelist known origins only
- Rate limit: handled by Java platform

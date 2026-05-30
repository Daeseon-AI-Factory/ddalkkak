# DalkkakAI — Blueprint (v2)

> **Canonical product + architecture reference.** Supersedes prior versions of README, SPEC.md, ROADMAP.md, AGENTS.md, COST.md (those are now legacy under `old_repo/`).
>
> **Status:** v2.1 — Tauri pivot (May 2026). New monorepo from scratch using this document as source of truth.

---

## 1. Mission

> **"솔로 indie hacker가 본인 Claude Code/Codex로 여러 service를 동시에 만들고 운영하는 native desktop workspace OS."**

**Refined (2026-05-30, Jason 확정):** 더 정확히 — **1인 기업가가 새로운 서비스를 `시작(start) → 만들기(build) → 관리(manage) → 실제 운영(operate)`하는 데 필요한 모든 것**을 한 플랫폼에서, 여러 스타트업을 동시에. 이 4-단계 라이프사이클이 제품의 조직 축이다. 데이터 모델은 §5.5 The Connective Layer 참조.

핵심 원칙:
- **We don't call AI.** Users bring their own Claude Code/Codex. We provide the workspace, multi-pane orchestration, and augmentation around their AI.
- **Native desktop (Tauri).** Lightweight (~10MB binary, 30-80MB memory). Rust backend for PTY/tmux/file system. Browser sandboxing makes web-only impossible for this use case.
- **Cloud-augmented (not cloud-bound).** App runs locally; settings, skills, advisor reports sync via cloud backend; auth via Supabase.
- **Multi-startup first-class.** N startups in one workspace, not per-project.
- **Built for the founder first.** Jason uses it daily. Other users come later.

---

## 2. Why this exists — The founder's pain

Jason runs ~**12 macOS desktops** simultaneously while building services:

```
Each desktop: Claude Code session, Cursor, Claude.ai tab, terminal
1-3 startups × ~4 tools = ~12 desktops
```

Daily flow exhausting: constant Mission Control switching, lost context, can't tell at a glance which Claude Code is working / idle / errored.

**MVP success criterion:**

> **"Jason can replace his 12 desktops with one DalkkakAI app for a full week."**

Market, pricing, competitors are secondary to this.

---

## 3. Target user

| Tier | Who | When |
|---|---|---|
| **Primary** | Jason himself (scratch-your-own-itch) | Phase 0-2 |
| **Secondary** | Other indie hackers (vibe coder ~ senior dev, ever opened a terminal) | Phase 3+ |
| **Excluded** | Pure non-technical users | Lovable/Bolt territory |

---

## 4. Product identity & wedge

**One-line category:** *"Lightweight native multi-pane terminal multiplexer + Claude Code augmentation platform for solo indie hackers running multiple startups."*

### Competitive landscape

| Product | Strength | Why we're different |
|---|---|---|
| **BridgeMind / BridgeSpace** | Same philosophy, 10K Discord, V3 shipped | They're **per-project + Electron**. We're **multi-startup + Tauri** (5-10x lighter). |
| **Warp** | Modern terminal + AI, native Rust | Single-session focus. We're multi-pane multi-startup. |
| **GitHub Codespaces / Gitpod** | Cloud dev env | Cloud-bound, enterprise. We're local-first. |
| **VS Code / Cursor** | Editor-centric, AI integrated | Editor-first. We're terminal-first. |
| **tmux + iTerm** | Power user | Local, no GUI. We're tmux made visual. |
| **Lovable / Bolt / v0** | AI codegen platforms | We don't call AI; users bring their own. Different category. |

### Our defensible wedge

1. **Native lightweight (Tauri)** — vs Electron-based competitors
2. **Multi-startup as first-class citizen** — vs per-project competitors
3. **Claude Code augmentation** — vs raw terminal competitors

---

## 5. Core layers

| Layer | Purpose | AI calls? |
|---|---|---|
| **1. Multi-pane terminal multiplexer** | xterm.js + tmux, drag-resize grid | ❌ Pure logic |
| **2. Multi-session orchestration** | Git worktree per session, file watch, local state | ❌ Pure logic |
| **3. Claude Code augmentation** | Parse "Tool: edit X" / confirms into friendly UI | △ Pattern matching mostly |
| **4. Viz layer** | Architecture / flow diagrams (Mermaid, React Flow) | △ Optional |
| **5. Skills / templates** | Jason's Claude Code know-how packaged, auto-injected | ❌ Static + conditional |
| **6. Cross-startup dashboard** | Uptime, metrics across startups | ❌ Display only |
| **6b. Advisor agent (cloud)** | Daily portfolio change summary | ✅ Uses user's own Claude key |

**90%+ runs without our AI calls.** AI parts use user's own key via Anthropic TypeScript SDK.

---

## 5.5 The Connective Layer (the data spine) — confirmed 2026-05-30

> The 6 layers above are NOT 6 separate features. They are bound into one operating
> system by a **connective layer**: a living graph of every "connection point" across
> the whole portfolio. Layers 1–2 are the substrate (work happens, data is born);
> layer 3 feeds the graph; layers 4 / 6 / 6b read it. This is what turns "a terminal
> multiplexer" into "a solo founder's startup OS."

**Connection points (graph node types), per startup** — *Jason's words:* 이 사업이 뭐고 · 구조/아키텍처가 어떻고 · 이슈가 뭐고 · 시각적으로 어떤 흐름이고 · 결제 내역이 어떻고 — 전부.

**How the graph stays fresh — two buckets:**
- **External metrics → PULL real data.** Billing, uptime, etc. from real sources (Stripe / Java platform / monitors).
- **Internal change → agents PUSH in the platform standard format.** Important user flows, architecture, and 각종 변경 are recorded by the agents *as they work, in the way most suitable for the platform.*

**Hard constraint (non-negotiable, Jason):** logging/standards must NEVER distort the work. *"토큰은 더 써도 되지만 로깅·표준 때문에 작업을 왜곡하면 안 된다. 작업은 철저히 작업대로, 로깅·시각화는 포맷 따른 부가 작업일 뿐."* → This ends the era of recording every change by hand.

**The standard (Jason):**
- **Fixed / locked** — versioned (`schema_version` per entry; evolve across versions with migration so the graph stays joinable).
- **Human-first** — defined in the direction a *person* finds most comfortable (legible markdown, not machine blobs).
- **Refined by doing** — dogfooded and tuned in use.
- **Platform-owned** — agents conform to it. Every node carries **provenance** (confirmed / inferred / hypothesis) so an inferred node can never masquerade as fact.

**Lifecycle mapping — the 4 stages → the layers:**
| Stage | What | Layers |
|---|---|---|
| **시작 / start** | scaffold a new service | sidebar / new-startup |
| **만들기 / build** | the real work | 1–2 (terminal/session) + 3 (Claude Code) |
| **관리 / manage** | the connective graph: issues · structure · flows | 3 (capture) + 4 (viz) |
| **운영 / operate** | run it: uptime · metrics · billing · daily summary | 6 (dashboard) + 6b (advisor) |

**Security model (consumer-appropriate, Jason):** per-project path designation → the platform integrates with *that path only*; additional paths require an explicit, confirmed grant; our automation only ever touches confirmed project paths. Never demands scary OS-wide permissions (no blanket Full Disk Access) — tuned to what an ordinary user is comfortable granting. (The raw shell the user types in is governed by standard OS prompts; what we constrain is *our automation's* reach.)

---

## 6. Architectural decisions

### Stack — TypeScript renderer + Rust backend (Tauri)

```
Frontend (Tauri renderer / webview):
  Vite + React 18 + TypeScript
  xterm.js + addons (fit, web-links)
  react-mosaic-component (multi-pane grid)
  Tailwind CSS + shadcn/ui

Desktop runtime:
  Tauri 2.x

Local backend (Tauri Rust):
  portable-pty (PTY, cross-platform, VS Code-quality)
  tokio (async runtime)
  tokio::process for tmux subprocess
  git2 or git subprocess (worktree management)
  serde for JSON
  tauri::command for frontend ↔ Rust IPC
  tauri::Window::emit for streaming PTY output

Cloud backend (TypeScript, Phase 1.4+):
  Node.js 22 + TypeScript
  Hono on Fly.io
  Supabase (auth + Postgres)
  Java platform proxy (billing, rate-limit) via REST + OpenAPI

Cloud DB / Auth:
  PostgreSQL via Supabase
  Supabase Auth (Tauri OAuth via tauri-plugin-oauth)

Storage:
  Local filesystem (worktrees, panes state)
  Cloudflare R2 (cloud sync of skills, advisor reports)

Deploy:
  Tauri auto-updater (CDN-hosted releases)
  Cloud backend → Fly.io
```

### Why Tauri (not Electron, not Swift)

- **Memory: 30-80MB (Tauri) vs 100-300MB (Electron)** — critical for multi-pane × multi-startup
- **Binary: ~10MB (Tauri) vs ~150MB (Electron)**
- **System WebKit on macOS** — no Chromium bundle; xterm.js validated on WebKit
- **Rust backend** — best-in-class PTY (portable-pty, used by Warp, WezTerm)
- **Cross-platform** — macOS / Linux / Windows from one codebase
- **Auto-updater built-in**
- Native Swift would lock out Linux/Windows

### Why not pure web

Browser sandboxing prohibits direct PTY/process spawn. User's local Claude Code/Codex binaries can't be controlled from a cloud web app. **Web-only is technically incapable of solving Jason's daily pain.**

### Why Platform/Product split

Billing, rate limiting, quota tracking handled by separate **Java/Spring platform**. DalkkakAI calls platform via REST.

---

## 7. Repo structure

```
ddalkkak/
├── apps/
│   ├── desktop/                 ← Tauri app (main product)
│   │   ├── src/                 ← React frontend (Vite renderer)
│   │   ├── src-tauri/           ← Rust backend
│   │   │   ├── src/
│   │   │   │   ├── main.rs
│   │   │   │   ├── pty.rs       ← portable-pty wrapper
│   │   │   │   ├── tmux.rs
│   │   │   │   ├── worktree.rs
│   │   │   │   └── commands.rs
│   │   │   ├── Cargo.toml
│   │   │   └── tauri.conf.json
│   │   └── package.json
│   └── cloud/                   ← Hono on Fly.io (Phase 1.4+, placeholder)
├── packages/                    ← TS shared libs (renderer-side)
│   ├── viz/  augmentor/  skills/  advisor/  platform-client/  shared/
├── docs/
│   ├── BLUEPRINT.md
│   └── MIGRATION_PLAN.md
├── old_repo/                    ← Frozen v1 Python (runnable, reference)
└── (configs: pnpm-workspace.yaml, biome.json, tsconfig.base.json, etc.)
```

**Migration from prior bootstrap:**
- `apps/web` and `apps/api` (initial Hello world stubs) will be **superseded by `apps/desktop`**. Their React content moves into apps/desktop/src; Hono stub is replaced by Tauri Rust backend.
- Cloud backend lives in `apps/cloud` but not active until Phase 1.4.
- `packages/*` stays unchanged — all renderer-side, works inside Tauri webview.

---

## 8. Phase plan

### Phase 0 — Foundation (completed)
- ✅ pnpm monorepo skeleton
- ✅ docs/BLUEPRINT.md, MIGRATION_PLAN.md
- ✅ old_repo/ preservation

### Phase 1.0 — Tauri scaffold (Week 1, NEW)
**Goal:** apps/desktop boots as a Tauri app.
**Success:** `cd apps/desktop && pnpm tauri dev` opens a native window.

- Bootstrap Tauri 2.x under apps/desktop
- Rust deps: portable-pty, tokio, serde
- Delete apps/web, apps/api (replaced)
- Move React content into apps/desktop/src

### Phase 1.2 — Single PTY pane (Week 2-3)
**Goal:** xterm.js connected to Rust-spawned PTY via Tauri events.
**Success:** open app, type `ls`, see output.

- `src-tauri/src/pty.rs`: portable-pty spawning bash
- Tauri commands: `pty_spawn`, `pty_write`, `pty_resize`, `pty_kill`
- Tauri events: stream PTY stdout to webview
- xterm.js renderer component

### Phase 1.3 — Multi-pane + tmux persistence (Week 4-5)
**Goal:** react-mosaic grid, multiple PTYs, tmux sessions survive restart.

- react-mosaic-component integration
- `src-tauri/src/tmux.rs`: spawn/attach tmux sessions
- Local pane layout persistence (JSON or sqlite)

### Phase 1.4 — Cloud auth + multi-startup sidebar (Week 6-7)
**Goal:** Supabase auth, multi-startup CRUD with cloud sync.

- apps/cloud Hono backend on Fly.io
- Supabase project + DB schema (users, startups, sessions)
- Tauri-side auth flow (tauri-plugin-oauth)
- Multi-startup sidebar UI

### Phase 1.5 — Dogfood test (Week 8+)
**Goal:** Jason replaces 12 desktops for 1 full week.

### Phase 2 — Augmentation (Month 3+)
- Claude Code output parser (packages/augmentor)
- Diff viewer, friendly confirm UI
- Skills auto-injection

### Phase 3 — Multi-startup ops (Month 4+)
- Architecture viz (packages/viz)
- Cross-startup uptime monitoring
- Advisor daily summary (cloud)

### Phase 4 — Beta release (Month 6+)
- Tauri auto-updater release pipeline
- Public landing
- Billing via Java platform

---

## 9. Out of scope

- ❌ Browser-only / web-only (technically impossible for our use case)
- ❌ AI codegen ourselves — BYO Claude Code/Codex always
- ❌ Lovable/Bolt-style "describe → app" flow
- ❌ Non-technical user support
- ❌ Billing / rate-limit in DalkkakAI (Java platform)
- ❌ Mobile — long-term maybe
- ❌ Multi-tenant cloud workspace (this is a native app)

---

## 10. Open questions

1. Java platform readiness — production / in-dev / parallel?
2. Tauri auto-update CDN — Cloudflare R2?
3. macOS code signing — Apple Developer account
4. Skills marketplace monetization
5. Supabase OAuth + Tauri deep-link callback specifics

---

## 11. References

- **BridgeMind / BridgeSpace** — same philosophy, Electron, per-project
- **Warp Terminal** — native Rust terminal, GPU rendering
- **VS Code's xterm.js + node-pty** — Rust equivalent is portable-pty
- **Tauri-based products** — Spacedrive, Pot, Trezor Suite (migrated from Electron)
- **Old codebase (Python)** — `old_repo/`, reference for worktree orchestration

---

## 12. Living document protocol

- Canonical reference. Update on every decision change (not chat memory).
- Old decisions get strikethrough or "(deprecated)" — history matters.
- New layers / services / phases — added here first; code follows.
- README.md stays short, points here.

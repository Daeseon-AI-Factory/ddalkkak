# DalkkakAI — Blueprint (v2)

> **Canonical product + architecture reference.** Supersedes prior versions of README, SPEC.md, ROADMAP.md, AGENTS.md, COST.md (those are now legacy under `old_repo/`).
>
> **Status:** v2 reframe (May 2026). Pre-implementation. New monorepo will be built from scratch using this document as the source of truth.

---

## 1. Mission

> **"솔로 indie hacker가 본인 Claude Code/Codex로 여러 service를 동시에 만들고 운영하는 cloud workflow OS."**

핵심 원칙:
- **We don't call AI.** Users bring their own Claude Code/Codex. We provide the workspace, multi-pane orchestration, and augmentation around their AI.
- **Cloud-native.** Browser-first. No install. Works on macOS / Windows / Linux / iPad.
- **Multi-startup first-class.** N startups in one workspace, not per-project.
- **Built for the founder first.** Jason uses it daily. Other users come later.

---

## 2. Why this exists — The founder's pain

Jason is currently running ~**12 macOS desktops** simultaneously while building services:

```
Each desktop holds: Claude Code session, Cursor, Claude.ai tab, terminal
1-3 startups × ~4 tools = ~12 desktops
```

Daily flow is exhausting: constant Mission Control switching, lost context, can't tell at a glance which Claude Code is working / idle / errored.

**MVP success criterion** — literally one sentence:

> **"Jason can replace his 12 desktops with one DalkkakAI screen for a full week."**

Market, pricing, competitors are secondary to this. If Jason's daily flow doesn't improve, nothing else matters.

---

## 3. Target user

| Tier | Who | When |
|---|---|---|
| **Primary** | Jason himself (scratch-your-own-itch) | Phase 0-2 |
| **Secondary** | Other indie hackers (vibe coder ~ senior dev spectrum, ever opened a terminal) | Phase 3+ |
| **Excluded** | Pure non-technical users (designers/marketers) | Lovable/Bolt territory, not us |

---

## 4. Product identity & wedge

**One-line category:** *"Cloud-native multi-pane terminal multiplexer + Claude Code augmentation platform for solo indie hackers running multiple startups."*

### Competitive landscape

| Product | Strength | Why we're different |
|---|---|---|
| **BridgeMind / BridgeSpace** | Same philosophy, 10K Discord, V3 shipped | They're **local desktop**, **per-project**. We're cloud + multi-startup. |
| **Warp** | Modern terminal + AI | Native, single-session focus. We're cloud + multi-pane + multi-startup. |
| **GitHub Codespaces / Gitpod** | Cloud dev env | Terminal is secondary, enterprise-targeted. We're terminal-first, indie-targeted. |
| **VS Code / Cursor** | Editor-centric, AI integrated | Local, editor-first. We're cloud, terminal-first. |
| **tmux + iTerm** | Power user finale | Local only, no GUI, steep learning curve. We're tmux made visual + cloud. |
| **Lovable / Bolt / v0** | AI codegen platforms | We don't call AI; users bring their own. Different category entirely. |

### Our defensible wedge — three differentiators

1. **Cloud-native** (everyone competitor above except Codespaces/Gitpod is local)
2. **Multi-startup as first-class citizen** (BridgeMind/Warp/Cursor are all per-project)
3. **Claude Code augmentation** (parse output, inject skills, visualize — others give you raw terminal)

---

## 5. Core layers (what DalkkakAI actually does)

| Layer | Purpose | AI calls? |
|---|---|---|
| **1. Cloud terminal multiplexer** | xterm.js + tmux backend, multi-pane visual layout | ❌ Pure logic |
| **2. Multi-session orchestration** | Git worktree per session, docker preview, WebSocket | ❌ Pure logic |
| **3. Claude Code augmentation** | Parse "Tool: edit X" / confirm dialogs into friendly UI | △ Pattern matching mostly, AI only at edges |
| **4. Viz layer** | Architecture / business-flow diagrams (Mermaid, React Flow) | △ Optional (code → diagram) |
| **5. Skills / templates** | Jason's Claude Code know-how packaged, auto-injected on session start | ❌ Static content + conditional inject |
| **6. Cross-startup dashboard** | Uptime, metrics, revenue across all startups | ❌ Display only |
| **6b. Advisor agent** | Daily portfolio change summary | ✅ Uses user's own Claude key (BYO) |

**Bottom line:** 90%+ of DalkkakAI runs without our AI calls. The few AI-touching parts use the Anthropic TypeScript SDK with the user's own key.

---

## 6. Architectural decisions

### Stack — TypeScript end-to-end

```
Frontend:
  - Vite + React 18 + TypeScript
  - xterm.js + addons (fit, web-links, attach)
  - react-mosaic-component (multi-pane grid)
  - Tailwind CSS + shadcn/ui
  - TanStack Query (server state)

Backend:
  - Node.js 22 + TypeScript
  - Hono (web framework — modern, light, fast) — or Fastify if more battle-tested needed
  - node-pty (PTY management, same Microsoft team as xterm.js)
  - ws (WebSocket)
  - Prisma (ORM)

Database / Auth:
  - PostgreSQL via Supabase
  - Supabase Auth (email + OAuth)

Storage:
  - Cloudflare R2 (worktree files, build artifacts) — kept from old stack
  - Local filesystem for hot worktrees

Real-time:
  - WebSocket (PTY stream both directions)
  - Server-Sent Events for one-way updates (status pings)

Deploy:
  - Frontend + Backend → Fly.io (multi-region, terminal latency wins)
  - DB → Supabase
  - Storage → Cloudflare R2

Tooling:
  - pnpm + pnpm-workspace.yaml (monorepo)
  - Turborepo (build caching, parallelism) — optional, add when builds get slow
  - Biome (linter + formatter, faster than ESLint+Prettier)
  - Vitest (tests)
  - Playwright (e2e for terminal interaction)
```

### Why Node.js (not Python, Go, or Java)

- **TypeScript end-to-end with frontend** — no language context switching for solo dev
- **node-pty + xterm.js** are by the same Microsoft team — dramatically tighter integration than Python's ptyprocess
- **All major cloud-terminal products use Node.js or Go** (VS Code Server, code-server, ttyd, Coder.com) — Python has essentially no reference implementations in this domain
- **AI usage in our product is near-zero** — Python's LangGraph/Anthropic SDK advantage no longer applies; Anthropic's TypeScript SDK is first-class
- **Go and Java**: Go is fine for Phase 3+ (only if a terminal worker becomes the bottleneck at 1K+ concurrent sessions). Java Spring is over-engineered for solo MVP and mismatched for real-time terminal workloads

### Why not bundle everything ourselves — Platform/Product split

Billing, rate limiting, quota tracking, and possibly auth integration are handled by a **separate Java/Spring platform** (Jason's broader infrastructure that serves all his products). DalkkakAI calls this platform via REST.

```
[DalkkakAI Node.js backend]
    ↓ HTTPS REST + Bearer token
[Java Platform — billing, rate-limit, quota]
    ↓
[Stripe, Postgres, etc.]
```

- Phase 0-1: REST + OpenAPI (Spring SpringDoc auto-generates spec → `openapi-typescript` generates TS client in DalkkakAI)
- Phase 2+: gRPC for hot paths if latency/throughput needs it

---

## 7. Repo structure

```
ddalkkak/
├── apps/
│   ├── web/                  # Frontend (Vite + React)
│   │   ├── src/
│   │   ├── index.html
│   │   └── package.json
│   └── api/                  # Backend (Node.js + Hono + node-pty)
│       ├── src/
│       └── package.json
├── packages/
│   ├── viz/                  # Visualization library (Mermaid + React Flow wrappers)
│   ├── augmentor/            # Claude Code output parser & friendly UI
│   ├── skills/               # Jason's Claude Code know-how packs (md/yaml content + loader)
│   ├── advisor/              # AI calls (Anthropic TS SDK, user's own key)
│   ├── platform-client/      # Auto-generated TS client for Java platform's OpenAPI spec
│   └── shared/               # Types, utils, constants
├── docs/
│   ├── BLUEPRINT.md          # This file — canonical reference
│   ├── MIGRATION_PLAN.md     # Old Python repo → new monorepo plan
│   └── (future: SPEC.md, ROADMAP.md rewritten for v2)
├── old_repo/                 # Frozen Python codebase from v1 — runnable, reference only
│   └── (all prior files moved here verbatim)
├── pnpm-workspace.yaml
├── package.json              # Root, scripts only
├── biome.json
├── tsconfig.base.json
├── .gitignore
└── README.md                 # New, brief, points to docs/BLUEPRINT.md
```

**Why monorepo + packages structure:**
- Solo developer: one repo to manage, one install, one CI
- Type sharing: `packages/shared` provides types both apps consume; `packages/advisor` exports its summary type so `apps/web` renders it with autocomplete
- Future-proof: any `packages/*` (especially `viz`, `skills`) can be extracted to its own repo + published to npm later with `git subtree split` or `git filter-repo`

---

## 8. Phase plan (high-level)

### Phase 0 — Foundation (Week 1-2)
**Goal:** New monorepo skeleton, dev environment, deployable shell  
**Success:** `pnpm dev` runs locally; blank UI deployed to a Fly.io URL; CI green

Tasks:
- pnpm workspace setup
- apps/web bootstrapped (Vite + xterm.js hello world)
- apps/api bootstrapped (Hono + a single WebSocket echo route)
- Supabase project provisioned (auth + DB)
- Fly.io deploy pipeline (web + api)
- Biome + Vitest + Playwright configs

### Phase 1 — Core MVP (Week 3-6)
**Goal:** Multi-pane terminal + multi-startup. Replace Jason's 12 desktops.  
**Success:** Jason uses DalkkakAI exclusively for a full week of work.

Features:
- Multi-pane xterm.js grid (react-mosaic, drag-resize)
- PTY backend per pane (node-pty, tmux for persistence)
- Session persistence (refresh-safe, server-side tmux sessions)
- Per-pane metadata header (startup name, pane type, status)
- Multi-startup sidebar (CRUD, switch, organize)
- Visual status indicators (●green = Claude active, ◐yellow = idle, ✕red = errored)
- Auth (Supabase Auth — email login is enough for self)

### Phase 2 — Augmentation (Week 7-12)
**Goal:** Make Claude Code output legible. Inject Jason's know-how.  
**Success:** Jason's per-session Claude Code productivity measurably higher.

Features:
- Claude Code output parser (`packages/augmentor`) — recognize Tool calls, file edits, confirm dialogs
- Friendly diff viewer (side-pane shows file changes from Claude)
- Skill auto-injection (`packages/skills`) — when session starts, paste configured skill pack into Claude Code
- Inline confirm UI (Claude asks Y/N → render as a button, not raw text)
- Cursor replacement option: Monaco editor in a pane (read/edit files alongside Claude Code)

### Phase 3 — Multi-startup operations (Month 4+)
**Goal:** Cross-startup ops layer. Real operator value beyond build.  
**Success:** Jason's overhead for running N startups decreases meaningfully.

Features:
- Architecture viz from code (`packages/viz` — Mermaid auto-generation)
- Cross-startup uptime monitoring (ping deployed URLs, status dot per startup)
- Daily advisor summary (`packages/advisor` — Claude API call with portfolio context)
- Skills marketplace foundation (publish/subscribe to skill packs)

### Phase 4 — Beta release (Month 6+)
**Goal:** First paying users  
**Success:** 50 paying users, $500+/mo MRR

Features:
- Onboarding flow for new users
- Public landing page + waitlist
- Billing integration via Java platform (subscription tiers: Free / Starter / Growth / Scale)
- Documentation site
- Skills marketplace MVP (Jason's published skills available to paid users)

---

## 9. Out of scope (we are explicitly NOT doing)

- ❌ AI codegen ourselves — BYO Claude Code/Codex always
- ❌ Lovable/Bolt-style "describe → app" flow — different category
- ❌ Non-technical user support — we serve people who can use a terminal
- ❌ Billing / rate-limit infrastructure inside DalkkakAI — Java platform handles
- ❌ Native desktop app — cloud only
- ❌ Mobile UI — long-term maybe, not now
- ❌ Multi-tenant enterprise — Phase 4+, requires security redesign (Firecracker etc.)
- ❌ Generic IDE features (intellisense, refactoring) — Cursor/VS Code do that; we orchestrate around them
- ❌ Self-hosted on-prem — cloud-only product

---

## 10. Open questions (to resolve before/during Phase 0)

1. **Java platform readiness** — Is the platform production-ready, in-progress, or to-be-built in parallel? Determines whether Phase 0-1 includes platform integration or starts with mock/self-contained billing.
2. **Docker-in-Docker preview** — Old stack used socket-mount DinD; fine for Jason solo, security risk for multi-user. Resolve before Phase 4.
3. **Skills marketplace monetization** — Revenue share model, free vs paid skills boundary.
4. **Mobile/tablet** — When (if ever) does iPad get a first-class experience?
5. **Cursor integration** — Replace with Monaco in-pane (Phase 2), or keep users on native Cursor side-by-side?

---

## 11. References & inspiration

- **BridgeMind / BridgeSpace** (bridgemind.ai) — same philosophy product, local-only, per-project. Inspiration for multi-pane UX; we differentiate on cloud + multi-startup.
- **VS Code's web terminal architecture** — xterm.js + node-pty stack; we follow.
- **code-server** (Coder) — cloud IDE reference for how to host editor-like surfaces in a browser.
- **Coder.com** — cloud development environments at scale; reference for multi-tenant patterns when we get there.
- **Anthropic Claude Code skills system** — our skills packs build on top of this.
- **Old codebase (Python, FastAPI)** — preserved in `old_repo/`; reference for worktree orchestration, PTY/WebSocket bridge patterns, billing scaffolding.

---

## 12. Living document protocol

- This file is the **canonical reference** for product + architecture decisions.
- Update it when a decision changes (don't rely on chat memory).
- Old decisions get a strikethrough or "(deprecated)" note rather than deletion (history matters).
- New layers, new external services, new phases — all get added here first, code follows.
- README.md (root) stays short and points here.

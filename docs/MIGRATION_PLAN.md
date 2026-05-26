# MIGRATION_PLAN — v1 (Python) → v2 (Node.js TS monorepo)

> Live document. Updated as migration progresses.

## Goal

기존 Python/FastAPI codebase를 `old_repo/`로 보존하고, 같은 repo root에 새 Node.js TypeScript monorepo 셋업.

## Principles

1. **Git history 보존** — git mv only, no copy
2. **Old code 실행 가능 유지** — `cd old_repo && docker-compose up`
3. **One repo, one history** — separate repo 아님
4. **Clean root for v2** — root는 새 monorepo, old는 격리

## Final structure (목표)

```
ddalkkak/
├── apps/web/                    # v2 frontend (Vite + React + TS)
├── apps/api/                    # v2 backend (Node.js + Hono + TS)
├── packages/                    # viz, augmentor, skills, advisor, shared
├── docs/
│   ├── BLUEPRINT.md             # canonical v2 reference
│   └── MIGRATION_PLAN.md        # this file
├── old_repo/                    # frozen v1 (Python, runnable)
├── package.json
├── pnpm-workspace.yaml
├── biome.json
├── tsconfig.base.json
├── LICENSE                      # root 유지
├── .gitignore                   # extended for both Python + Node
└── README.md                    # new, short, points to BLUEPRINT
```

## Step-by-step execution

### Step A: Documents
- [x] docs/BLUEPRINT.md (canonical reference) — Task #1 완료
- [x] docs/MIGRATION_PLAN.md — this file (Task #2)

### Step B: Move existing files to old_repo/ (Task #3)

```bash
mkdir -p old_repo

# Temp backup of BLUEPRINT (docs/ 통째로 옮길 거라 잠시 빼둠)
git mv docs/BLUEPRINT.md BLUEPRINT_NEW.md.tmp
git mv docs/MIGRATION_PLAN.md MIGRATION_PLAN_NEW.md.tmp

# Directories
git mv backend old_repo/backend
git mv frontend old_repo/frontend
git mv alembic old_repo/alembic
git mv tests old_repo/tests
git mv config old_repo/config
git mv logs old_repo/logs
git mv docs old_repo/docs

# Root files (Python/Docker)
git mv requirements.txt alembic.ini pytest.ini Makefile \
       Dockerfile docker-compose.yml .dockerignore .env.example \
       old_repo/

# Root docs (v1)
git mv README.md CLAUDE.md LEARNING.md ENGLISH.md \
       DOC_SYSTEM.md LOG_SYSTEM.md old_repo/

# Restore BLUEPRINT + MIGRATION_PLAN to new docs/
mkdir docs
git mv BLUEPRINT_NEW.md.tmp docs/BLUEPRINT.md
git mv MIGRATION_PLAN_NEW.md.tmp docs/MIGRATION_PLAN.md
```

**Files NOT moved (kept at root):**
- `LICENSE` — v2에도 적용
- `.git/` — repo state
- `.gitignore` — Node patterns 추가 예정, root 유지

### Step C: Bootstrap new monorepo skeleton (Task #4)

```bash
# Workspace config
cat > pnpm-workspace.yaml <<'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Root package.json (scripts only)
# tsconfig.base.json
# biome.json
# Extended .gitignore (Python + Node patterns)

# Apps
pnpm create vite apps/web --template react-ts
mkdir -p apps/api/src
# apps/api/package.json (hono, ws, node-pty)
# apps/api/src/index.ts (hello world hono server)

# Packages (stubs)
mkdir -p packages/{viz,augmentor,skills,advisor,shared}/src
# Each with package.json + src/index.ts barrel export

# New README.md (brief, points to BLUEPRINT.md)
# New CLAUDE.md (v2 frame, supersedes old_repo/CLAUDE.md)
```

### Step D: Provision external services (Task #5)
- Supabase project (auth + Postgres)
- Fly.io project (apps/web + apps/api)
- GitHub secrets for CI

### Step E: Phase 1 sub-tasks (Task #6)
Decomposed into 2-week chunks. See Task list for breakdown.

## What's preserved vs rewritten

| Component | Status | Notes |
|---|---|---|
| FastAPI backend | Preserved (old_repo/, reference) | Not extended |
| Next.js 14 frontend | Preserved (old_repo/, reference) | Some xterm.js code may be ported |
| Alembic + Postgres schema | Schema design preserved; v2 uses Prisma | Mostly redesigned (no AI tables) |
| JWT + bcrypt auth | Discarded | Supabase Auth replaces |
| Stripe integration | Discarded from DalkkakAI | Java platform handles |
| 7 specialized agents | Discarded | BYO Claude Code |
| 4-tier cost router | Discarded | No AI calls |
| xterm.js + tmux integration | Reimplemented (apps/web + apps/api, node-pty) | Old logic as reference |
| Git worktree orchestration | Reimplemented (TS) | Old Python logic = reference |
| Docker-in-Docker preview | Approach preserved for self-use; redesign before multi-tenant |

## Rollback path

만약 어디서든 깨지면:

```bash
git revert HEAD               # 마지막 commit 되돌리기
git reset --hard <last-good>  # 또는 강하게
```

`old_repo/`는 항상 사용 가능 — v2가 작동 안 하면 즉시 fallback:

```bash
cd old_repo
docker-compose up
```

## After full migration

- `pnpm install` (root) — 모든 workspace deps 설치
- `pnpm dev` — apps/web + apps/api 병렬 실행
- `cd old_repo && docker-compose up` — v1 fallback
- docs/BLUEPRINT.md = canonical reference

---

## v2.1 amendment — Tauri pivot (May 2026)

After bootstrap commit `d558213`, reality check: **browser sandboxing prohibits PTY/process spawn**. Cloud web-only is technically incapable of solving Jason's daily pain (12 desktops with local Claude Code/Codex). Hello UI works in browser, but the actual product (controlling local processes) cannot.

**Decision:** pivot to **Tauri 2.x (Rust)** native desktop app. Trade-offs:
- ~10MB binary, 30-80MB memory (vs Electron's 150MB binary, 100-300MB memory)
- Rust backend (portable-pty + tokio) for PTY/tmux/fs/git
- macOS WebKit webview (no Chromium bundle)
- Cloud backend (apps/cloud) retained for auth/sync/advisor only (Phase 1.4+)

### Affected components

| Component | v2.0 (initial bootstrap) | v2.1 (Tauri pivot) |
|---|---|---|
| Desktop runtime | None (web app) | Tauri 2.x |
| Frontend | apps/web (Vite + React standalone) | apps/desktop/src (same code, inside Tauri webview) |
| Local backend | apps/api (Hono + node-pty planned) | apps/desktop/src-tauri (Rust + portable-pty) |
| Cloud backend | (mixed into apps/api) | apps/cloud (separated, Phase 1.4+) |
| Languages | TypeScript only | **TypeScript + Rust** |
| PTY library | node-pty | portable-pty |
| Distribution | Browser URL | Tauri DMG/MSI/AppImage + auto-updater |

### Step F: Tauri scaffold (Phase 1.0 — new prerequisite task)

```bash
# Remove placeholder apps (their content goes into apps/desktop)
git rm -r apps/web apps/api

# Bootstrap Tauri app
pnpm create tauri-app apps/desktop --template react-ts --manager pnpm

# Add Rust crates
cd apps/desktop/src-tauri
cargo add portable-pty
cargo add tokio --features rt-multi-thread,macros,process,io-util,sync
cargo add serde --features derive

# Verify scaffold
cd /Users/daeseonyoo/Documents/GitHub/ai-product/ddalkkak
pnpm install
cd apps/desktop && pnpm tauri dev   # native window should open
```

### Step G: Restructure Phase 1 tasks

- **Task #8** (Phase 1.2 PTY pane): now Tauri Rust portable-pty + xterm.js streamed via tauri events
- **Task #9** (Phase 1.3 Multi-pane + tmux): tmux subprocess via Rust `tokio::process`
- **Task #7** (Auth + DB): moved to Phase 1.4 (cloud backend layer comes later)
- **New Task #12** (Phase 1.0): Tauri scaffold — blocks Tasks #8, #9

### Files affected in already-committed bootstrap

To be deleted after Task #12 completes:
- `apps/web/*` (React placeholder — content migrates to apps/desktop/src)
- `apps/api/*` (Hono placeholder — replaced by Tauri Rust + later apps/cloud)

Unchanged:
- `packages/*` (all renderer-side libs work inside Tauri webview)
- `docs/` (this file + BLUEPRINT.md)
- `old_repo/` (untouched)
- Root configs (pnpm-workspace.yaml, biome.json, tsconfig.base.json)

# DalkkakAI

> Native macOS multi-pane terminal multiplexer + Claude Code workspace for solo founders running several startups in parallel. Solo project, pair-programmed with Claude Code.

[![status: beta](https://img.shields.io/badge/status-v0.1.0_beta-orange)](https://github.com/Daeseon-AI-Factory/ddalkkak/releases/tag/v0.1.0)
[![platform: macOS](https://img.shields.io/badge/platform-macOS_Apple_Silicon-black?logo=apple)](#install)
[![stack: Tauri + Rust](https://img.shields.io/badge/Tauri_2-Rust_%2B_React_19-orange?logo=tauri)](#tech-stack)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Demo

<!-- TODO: replace this ASCII sketch with a 30s screen-recording GIF once captured.
     File will live at docs/media/demo.gif and be embedded here. -->

> _Screen recording coming. The sketch below shows the layout: a startup sidebar on the left, a resizable pane grid on the right, each pane a live shell._

```
🚀 default     │  ⌘D split · ⌘⇧D vsplit · ⌘W close · ⌘1-9 switch startup
💎 photo-ai    │ ┌───────────────────┬───────────────────┐
⚡ blog        │ │ pane a7b3  ●live   │ pane c2e1  ●live   │
+ new          │ │ $ claude           │ $ npm run dev      │
               │ │ > editing src/...  │ ready on :3000     │
               │ ├───────────────────┴───────────────────┤
               │ │ pane f9d4  ●live                       │
               │ │ $ tail -f logs/app.log                 │
               │ └────────────────────────────────────────┘
```

---

## What it is

A native macOS desktop app (Tauri + Rust) that gives you a grid of terminal panes, organized under multiple "startup" workspaces. Each pane is backed by a real `tmux` session, so the processes you run inside — `claude`, dev servers, log tails — **survive an app restart**.

In one sentence: *tmux made visual, with a multi-startup sidebar, built so the user's own Claude Code sessions are the thing being orchestrated.*

It does **not** call any AI itself. You bring your own Claude Code / Codex; the app is the workspace around it.

## Why it exists

I was running ~12 macOS desktops at once while building several services in parallel — a Claude Code session on one, a dev server on another, a log tail on a third — and losing real time to Mission Control switching. DalkkakAI collapses that into one window whose state persists.

The bar I set for "did this work": **replace those 12 desktops with one app for a full week.** That dogfood test has not been run yet (see [Status](#status--honest-scope)).

## How it works

The interesting parts are not the line count — they're three specific decisions:

**1. Terminal lifetime is decoupled from React.**
`react-mosaic` keys panes by their *path* in the layout tree. Splitting a pane changes that path, which React treats as an unmount — and a naive implementation kills the PTY (and your running `claude` session) on every split. So xterm and the PTY live in a **module-level registry** (`terminalRegistry.ts`), outside React entirely. The React component is just an attachment point that re-parents `term.element` into the DOM on mount. Only an explicit Close destroys anything. This is the pattern VS Code uses for its terminal hosting.

**2. Sessions persist through tmux, not through serialization.**
Each pane spawns `bash -c "tmux new-session -A -D -s dalkkak-<id>"`. The tmux server is a system daemon that outlives the app, so on relaunch the panes re-attach to still-running sessions. Layout (which panes, where, under which startup) is a JSON tree in localStorage. No custom persistence protocol.

**3. Subprocesses get an explicit environment.**
A Tauri GUI bundle inherits a minimal `PATH` and a near-empty environment — not your interactive shell's. That caused two real bugs: `claude --resume` froze for 15s (missing `TERM`/locale), and tmux silently failed to spawn (Homebrew not on `PATH`, rendering as `[exited]`). Fix: set `TERM`/`COLORTERM`/locale vars explicitly, augment `PATH` with `/opt/homebrew/bin`, resolve `tmux` by absolute path, and wrap the spawn in bash so failures print something readable instead of a frozen pane.

Every bug like that got a six-section post-mortem in [`docs/ISSUES.md`](docs/ISSUES.md) (symptom / root cause / fix / instruction-blame / avoidability / lessons), enforced as a repo rule. The full timeline lives as dated entries on the [project blog](https://daeseon.ai/projects/dalkkak-ai).

## Tech stack

| Layer | Choice |
|---|---|
| Desktop runtime | Tauri 2.x |
| Backend | Rust — `portable-pty`, `tokio`, `tracing`; 309 LOC across `src-tauri/src/` |
| Renderer | React 19 + TypeScript + Vite — 837 LOC across `apps/desktop/src/` |
| Terminal | xterm.js 6 + fit addon |
| Layout | react-mosaic-component 6.1.1 (pinned; v7 beta broke the tree API) |
| Sessions | tmux (system daemon), namespaced `dalkkak-<pane-id>` |
| IPC | 5 Tauri commands (`pty_spawn`/`write`/`resize`/`kill`, `log_augmentor_event`) + a `pty-output` event stream |
| Bundle | 10 MB `.app`, 3.6 MB zipped |

Why Tauri and not Electron or pure web: a browser can't spawn a PTY, which is the whole product; Tauri gives a ~10 MB bundle on system WebKit with a Rust backend that owns the process tree. Why not Swift: it would lock out a future Linux/Windows build for no compensating feature ([reasoning](docs/BLUEPRINT.md)).

## Project structure

```
apps/desktop/
  src/                  React renderer (7 files, 837 LOC)
    App.tsx             Mosaic layout + sidebar + shortcuts
    terminalRegistry.ts xterm + PTY registry (lives outside React)
    TerminalPane.tsx    thin DOM attachment point
    Sidebar.tsx         multi-startup list
    startups.ts         startup model + localStorage
  src-tauri/src/        Rust backend (309 LOC)
    pty.rs              PTY spawn, env hygiene, bash wrapper, visible EOF
    lib.rs              5 Tauri commands + tracing init
packages/augmentor/     Claude Code output parser (Phase 2.1, WIP — see Status)
content/logs/dalkkak-ai/  dated dev-log entries (rendered on the blog)
docs/                   BLUEPRINT, ROADMAP, ISSUES, MILESTONES, STACK, CONTEXT
old_repo/               frozen v1 (Python/FastAPI), reference only
```

## Status & honest scope

**Shipped (v0.1.0, Phase 1):** multi-pane terminal grid, tmux-backed persistence, multi-startup sidebar with per-startup layout, keyboard navigation, layout auto-reattach on launch, two-layer logging.

**Deliberately not done yet:**

- **Unsigned.** No Apple Developer signature, so first launch needs right-click → Open (or `xattr -cr`). Not notarized.
- **macOS Apple Silicon only.** Cross-platform Tauri build pipeline isn't wired.
- **Phase 2–4 are roadmap only.** Claude Code output augmentation (Phase 2), cross-startup operator layer (Phase 3), signed release + marketplace (Phase 4). A first-pass output parser exists but uses hardcoded regexes that don't match real Claude Code output — it needs to move to Claude Code's hooks API ([write-up](docs/ISSUES.md)).
- **Zero production users. The one-week dogfood test hasn't run.** The MVP success criterion above is a goal, not a result.

## Install

Requires macOS (Apple Silicon) and `tmux` (`brew install tmux`).

[Download v0.1.0](https://github.com/Daeseon-AI-Factory/ddalkkak/releases/tag/v0.1.0) → unzip → move `DalkkakAI.app` to `/Applications` → right-click → Open (needed once because it's unsigned).

Or build from source:

```bash
pnpm install
cd apps/desktop && pnpm tauri dev   # needs Rust toolchain + Node 22+
```

## Docs

| File | Role |
|---|---|
| [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md) | Product + architecture reference |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phase 1–4 breakdown |
| [`docs/ISSUES.md`](docs/ISSUES.md) | Six-section post-mortems (one per shipped bug) |
| [`docs/MILESTONES.md`](docs/MILESTONES.md) | Per-step log in three registers (engineering / raw / marketing) |
| [`docs/STACK.md`](docs/STACK.md) | What was built vs. what was borrowed |
| [`docs/CONTEXT.md`](docs/CONTEXT.md) | Self-contained situation summary (paste-friendly) |
| [`CLAUDE.md`](CLAUDE.md) | Agent operating rules for this repo |

## License

MIT

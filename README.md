# DalkkakAI

> A native macOS app that puts many terminal panes — across many project workspaces — in one window, with each pane backed by a persistent `tmux` session. Built for solo founders running several startups at once. Solo project, pair-programmed with Claude Code.

[![status: beta](https://img.shields.io/badge/status-v0.1.0_beta-orange)](https://github.com/Daeseon-AI-Factory/ddalkkak/releases/tag/v0.1.0)
[![platform: macOS](https://img.shields.io/badge/platform-macOS_Apple_Silicon-black?logo=apple)](#install)
[![stack](https://img.shields.io/badge/Tauri_2-Rust_%2B_React_19-orange?logo=tauri)](#tech-stack)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Demo

<!-- TODO: replace this ASCII sketch with a 30s screen-recording GIF at docs/media/demo.gif. -->

> _A screen recording is coming. The sketch below shows the layout: a workspace ("startup") sidebar on the left, a resizable grid of live shells on the right._

```
🚀 default     │  ⌘D split · ⌘⇧D vsplit · ⌘W close · ⌘1-9 switch workspace
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

## TL;DR for a reviewer

- **What it is:** a desktop terminal multiplexer (think *tmux made visual*) with a multi-workspace sidebar, built so a user's own Claude Code sessions are the thing being organized. It does not call any AI itself — you bring your own Claude Code / Codex.
- **What it shows I can do:** ship a real native desktop app (Tauri + Rust), debug systems-level problems (PTY, process environment, `PATH` resolution), make a non-obvious architecture call (decouple terminal lifetime from React), and document the work to a professional standard.
- **Honest scope:** Phase 1 is shipped as an unsigned beta on Apple Silicon. It has zero production users and the one-week dogfood test hasn't run. Phases 2–4 are roadmap only. Details in [Status](#status--honest-scope).
- **Code size:** 309 lines of Rust (backend) + 837 lines of TypeScript (renderer). The value is in the decisions below, not the line count.

## What this project demonstrates

| Area | Concretely, in this repo |
|---|---|
| Native desktop engineering | A working Tauri 2 app: Rust backend, React renderer, 5 typed IPC commands, an event stream for PTY output. |
| Systems-level debugging | Diagnosed and fixed three real PTY/subprocess bugs caused by the GUI process inheriting a minimal environment (see *How it works*). |
| Architecture judgment | Moved terminal + PTY ownership out of React's lifecycle so layout changes don't kill running sessions — VS Code's terminal-hosting pattern. |
| Pragmatic dependency choices | Used `tmux` (a 30-year-proven daemon) for persistence instead of writing a custom session-serialization layer. |
| Documentation discipline | Six structured post-mortems, a dated build log published to a blog, and a living architecture blueprint — all in-repo. |
| Honest communication | The README and docs lead with what *isn't* built. No inflated claims, every number traceable to the source. |

## How it works

Three decisions carry most of the engineering weight:

**1. Terminal lifetime is decoupled from React.**
`react-mosaic` keys panes by their *path* in the layout tree. Splitting a pane changes that path, which React treats as an unmount — so a naive implementation kills the PTY (and your running `claude` session) on every split. To prevent that, xterm and the PTY live in a **module-level registry** (`terminalRegistry.ts`), outside React. The React component is only an attachment point that re-parents the terminal's DOM node on mount; just an explicit Close destroys anything. This is the pattern VS Code uses to host its terminals.

**2. Sessions persist through tmux, not custom serialization.**
Each pane runs `bash -c "tmux new-session -A -D -s dalkkak-<id>"`. The tmux server is a system daemon that outlives the app, so on relaunch the panes re-attach to sessions that are still running. The layout itself (which panes, where, under which workspace) is a JSON tree in localStorage. No bespoke persistence protocol to maintain.

**3. Subprocesses get an explicit environment.**
A Tauri GUI bundle inherits a minimal `PATH` and a near-empty environment — not your interactive shell's. That caused two concrete bugs: `claude --resume` froze for ~15 seconds (missing `TERM` and locale variables), and `tmux` silently failed to launch (Homebrew wasn't on `PATH`, so the pane just showed `[exited]`). The fix sets `TERM`/`COLORTERM`/locale explicitly, prepends `/opt/homebrew/bin` to `PATH`, resolves `tmux` by absolute path, and wraps the spawn in bash so a failure prints a readable message instead of leaving a frozen pane.

Each bug like this became a six-section post-mortem in [`docs/ISSUES.md`](docs/ISSUES.md) (symptom / root cause / fix / instruction-blame / avoidability / lessons). The full chronological build log is published as dated entries at [daeseon.ai/projects/dalkkak-ai](https://daeseon.ai/projects/dalkkak-ai).

## Tech stack

| Layer | Choice |
|---|---|
| Desktop runtime | Tauri 2.x |
| Backend | Rust — `portable-pty`, `tokio`, `tracing` · 309 LOC in `src-tauri/src/` |
| Renderer | React 19 + TypeScript + Vite · 837 LOC in `apps/desktop/src/` |
| Terminal | xterm.js 6 + fit addon |
| Layout | react-mosaic-component 6.1.1 (pinned; the v7 beta broke the tree API) |
| Sessions | tmux (system daemon), namespaced `dalkkak-<pane-id>` |
| IPC | 5 Tauri commands (`pty_spawn` / `write` / `resize` / `kill`, `log_augmentor_event`) + a `pty-output` event stream |
| Bundle | 10 MB `.app`, 3.6 MB zipped |

**Why Tauri, not Electron or a web app:** a browser can't spawn a PTY, and spawning the user's local `claude` binary is the entire point — so a web app is technically incapable of solving the problem. Tauri gives a ~10 MB bundle on the system WebKit with a Rust backend that owns the process tree. **Why not Swift:** it would rule out a future Linux/Windows build for no feature gain ([full reasoning](docs/BLUEPRINT.md)).

## Project structure

```
apps/desktop/
  src/                    React renderer (837 LOC)
    App.tsx               Mosaic layout + sidebar + keyboard shortcuts
    terminalRegistry.ts   xterm + PTY registry (lives outside React)
    TerminalPane.tsx      thin DOM attachment point
    Sidebar.tsx           multi-workspace list
    startups.ts           workspace model + localStorage
  src-tauri/src/          Rust backend (309 LOC)
    pty.rs                PTY spawn, env hygiene, bash wrapper, visible EOF marker
    lib.rs                5 Tauri commands + tracing init
packages/augmentor/       Claude Code output parser (Phase 2.1, WIP — see Status)
content/logs/dalkkak-ai/  dated build-log entries (rendered on the blog)
docs/                     BLUEPRINT · ROADMAP · ISSUES · MILESTONES · STACK · CONTEXT
old_repo/                 frozen v1 (Python/FastAPI), reference only
```

## Status & honest scope

**Shipped (v0.1.0, Phase 1):** multi-pane terminal grid, tmux-backed persistence, multi-workspace sidebar with per-workspace layout, keyboard navigation, layout auto-reattach on launch, two-layer logging (Claude Code hooks + Rust `tracing`).

**Deliberately not done yet:**

- **Unsigned.** No Apple Developer signature, so the first launch needs right-click → Open (or `xattr -cr`). Not notarized.
- **macOS Apple Silicon only.** The cross-platform Tauri build pipeline isn't wired.
- **Phases 2–4 are roadmap only.** Output augmentation (2), cross-workspace operator layer (3), signed release + marketplace (4). A first-pass output parser exists but uses hardcoded patterns that don't match real Claude Code output — it needs to move to the Claude Code hooks API ([write-up](docs/ISSUES.md)).
- **Zero production users; the one-week dogfood test hasn't run.** The success criterion — replacing 12 desktops with one app for a week — is a goal, not a result.

## Install

Requires macOS (Apple Silicon) and `tmux` (`brew install tmux`).

[Download v0.1.0](https://github.com/Daeseon-AI-Factory/ddalkkak/releases/tag/v0.1.0) → unzip → move `DalkkakAI.app` to `/Applications` → right-click → Open (required once, because it's unsigned).

Or build from source:

```bash
pnpm install
cd apps/desktop && pnpm tauri dev   # needs the Rust toolchain + Node 22+
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

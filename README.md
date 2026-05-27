# DalkkakAI

> **Lightweight native multi-pane terminal multiplexer + Claude Code workspace for solo founders running multiple startups in parallel.** Built solo in ~26 hours using Claude Code as pair-programmer.

[![Status](https://img.shields.io/badge/status-beta-orange)](https://github.com/Daeseon-AI-Factory/ddalkkak/releases/tag/v0.1.0)
[![macOS](https://img.shields.io/badge/macOS-Apple_Silicon-black?logo=apple)](https://github.com/Daeseon-AI-Factory/ddalkkak/releases/tag/v0.1.0)
[![Bundle](https://img.shields.io/badge/.app-10_MB-success)](https://github.com/Daeseon-AI-Factory/ddalkkak/releases/tag/v0.1.0)
[![Stack](https://img.shields.io/badge/Tauri_2-Rust-orange?logo=tauri)](https://tauri.app)
[![Renderer](https://img.shields.io/badge/React_19-TypeScript-blue?logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## What is this

A native macOS app that gives you **multiple terminal panes across multiple "startup" workspaces**, each with persistent `tmux` sessions — so your `claude`, `codex`, dev servers, and log tails survive app restarts. Think *tmux made visual* + *VS Code Server's lifecycle pattern* + *multi-startup sidebar*.

```
🚀 default       │  ⌘D / ⌘⇧D / ⌘W              focus: a7b3
💎 photo-ai     │ ┌──────────────┬──────────────┐
⚡ blog-platf   │ │ 🚀 a7b3 (●)  │ 🚀 c2e1 (◐) │
+ New           │ │ $ claude     │ $ npm dev    │
                │ │ > Reading... │ ready :3000  │
                │ ├──────────────┴──────────────┤
                │ │ 🚀 f9d4 (○)                 │
                │ │ $ tail -f logs/app.log       │
                │ └──────────────────────────────┘
```

## Quick start

### Use it
[Download v0.1.0 (10 MB)](https://github.com/Daeseon-AI-Factory/ddalkkak/releases/tag/v0.1.0) — unsigned beta, requires macOS Apple Silicon + `tmux` (`brew install tmux`). See release page for install path (right-click → Open, OR `xattr -cr /Applications/DalkkakAI.app`).

### Build from source
```bash
pnpm install
cd apps/desktop && pnpm tauri dev
```
Requires Rust toolchain (`rustup`), Node 22+, `tmux`.

## Why it exists

The founder runs ~12 macOS desktops simultaneously while building multiple services — Claude Code session here, Cursor window there, dev server elsewhere, log tail in another. Constant Mission Control friction. DalkkakAI consolidates that into one window with persistent tmux backing.

**MVP success criterion:** *replace the 12 desktops with one app for a full week*.

## Engineering highlights

| | Detail |
|---|---|
| **Stack** | Tauri 2.x + Rust + React 19 + TypeScript + Vite + xterm.js + portable-pty + tmux |
| **Size** | 10 MB binary, 30–80 MB RAM (vs ~150 MB / ~300 MB for Electron equivalents) |
| **Lifecycle decouple** | xterm + PTY owned by module-level registry, not React components — Mosaic re-renders never destroy a running pane (VS Code Server pattern) |
| **Persistence** | localStorage layout tree + tmux server (system daemon) — `claude` sessions survive app restart with ~70 lines of glue |
| **Multi-startup** | per-startup pane layout, tmux session namespaced as `dalkkak-<pane-id>`, ⌘1-9 / ⌘⇧[/⌘⇧] navigation |
| **Observability** | Two-layer logging — Claude Code hooks → `logs/*.jsonl` + Rust `tracing` → `~/Library/Logs/DalkkakAI/runtime.log.YYYY-MM-DD` |
| **Bug-as-asset culture** | 6 six-section post-mortems in `docs/ISSUES.md`, each with prompt-quality blame + avoidability score |

## Docs

| File | Role |
|---|---|
| [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md) | Canonical product + architecture reference |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phase 1–4 sub-tasks + dependency graph + timeline |
| [`docs/MILESTONES.md`](docs/MILESTONES.md) | 3-tone log (engineering / raw / marketing) of every shipped step |
| [`docs/ISSUES.md`](docs/ISSUES.md) | 6-section post-mortems for every bug + fix |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | Deferred items with revisit triggers |
| [`docs/STACK.md`](docs/STACK.md) | Honest dependency map — what we built vs what we borrowed |
| [`docs/SHORTCUTS.md`](docs/SHORTCUTS.md) | Keyboard reference |
| [`docs/CONTEXT.md`](docs/CONTEXT.md) | Self-contained situation summary (paste-friendly for second-opinion review) |
| [`CLAUDE.md`](CLAUDE.md) | Agent rules — 8 numbered RULEs (#5b–d on subprocess hygiene + logging) |

## Status

**Phase 1 fully shipped** (v0.1.0). Phase 2 (Claude Code augmentation), Phase 3 (multi-startup operator layer), Phase 4 (signed release + marketplace) are roadmapped — see [`docs/ROADMAP.md`](docs/ROADMAP.md).

Old v1 (Python/FastAPI prototype) preserved in [`old_repo/`](old_repo/) for reference.

## License

MIT

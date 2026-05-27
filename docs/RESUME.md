# DalkkakAI — Resume / portfolio bullets

> Honest, drop-in bullets for resumes, LinkedIn, cover letters, or "tell me about this project" prompts. No marketing fluff. Last verified: 2026-05-27.

---

## Honest framing (read first)

- **Solo project, AI-pair-programmed.** Built with Claude Code as the coding partner. Architecture decisions, debugging direction, post-mortem authorship, and product calls are mine; most of the typed code is the model's.
- **Phase 1 only.** Multi-pane terminal + tmux persistence + multi-startup sidebar are shipped. Phase 2 (Claude Code augmentation), Phase 3 (operator layer), Phase 4 (signed release / marketplace) are roadmapped only.
- **Prototype scale.** 309 lines of Rust, 14 TypeScript files, single platform (macOS Apple Silicon), unsigned beta release. Production users: 0. Dogfood test: not yet run.
- The portfolio value is *AI-pair coding discipline + system thinking + documentation rigor*, not a finished product.

---

## Bullets (use as-is)

- Built a native macOS terminal multiplexer (DalkkakAI) on Tauri 2.x + Rust + React 19 + xterm.js — 309 lines of Rust, 14 TypeScript files.
- Designed a module-level terminal registry that keeps xterm and the PTY outside React's lifecycle, so react-mosaic remounts don't destroy running `claude` sessions — pattern modeled on VS Code Server's terminal hosting.
- Replaced bare-shell PTY with a `bash -c "tmux new-session -A -D"` wrapper so panes survive app restart via the tmux daemon; each pane keyed `dalkkak-<id>` and explicitly killed on close.
- Solved Tauri GUI's minimal-PATH problem with absolute-path tmux fallback (homebrew / usr-local / usr) plus PATH augmentation, eliminating silent `[exited]` panes when Homebrew binaries weren't on PATH.
- Pinned react-mosaic-component to 6.1.1 after the v7 beta's `first/second` → `children[]` API break broke the layout tree.
- Authored a 6-section post-mortem format in `docs/ISSUES.md` (symptom / root cause / fix / instruction-blame / avoidability / lessons), enforced for every shipped bug via `CLAUDE.md` RULE #6.
- Added two-layer observability — Claude Code hooks → `logs/*.jsonl` (prompts, actions, sessions) plus Rust `tracing` daily-rolling to `~/Library/Logs/DalkkakAI/runtime.log`.
- Migrated a v1 Python/FastAPI prototype into `old_repo/` and rebuilt as a Node + Tauri monorepo (`apps/desktop`), pivot recorded in commit `7f64ff2`.

---

## One-liner (LinkedIn headline / "what do you do" answer)

> Solo-built (with Claude Code) a native macOS multi-pane terminal app for founders running multiple Claude Code sessions in parallel — Tauri 2.x + Rust + React, ~309 Rust LOC, Phase 1 shipped as v0.1.0 beta.

---

## 30-second verbal pitch (interview / meetup)

> I run a lot of side projects and was burning hours on Mission Control switching between Claude Code sessions. So I built DalkkakAI — a 10 MB native macOS app, Tauri + Rust + React, that gives me multiple terminal panes across a multi-startup sidebar, each backed by a persistent tmux session so my `claude` sessions survive restarts. It's about 300 lines of Rust and 14 TypeScript files, built solo with Claude Code as a pair-programmer over a short sprint. Phase 1 is shipped; Phase 2 (parsing Claude Code output into a friendlier UI) is the actual product wedge and isn't built yet. The interesting engineering bits are the lifecycle-decouple pattern that keeps xterm and the PTY outside React so Mosaic remounts don't kill sessions, and a 6-section post-mortem doc for every bug.

---

## What NOT to claim

- ❌ Bundle size unless re-measured (README says 10 MB, an earlier commit says 8.7 MB)
- ❌ RAM range (never measured)
- ❌ "Replaces 12 desktops" — that's the *goal*, the dogfood test hasn't happened
- ❌ Number of users (zero)
- ❌ "Production-ready" — unsigned beta on a single platform

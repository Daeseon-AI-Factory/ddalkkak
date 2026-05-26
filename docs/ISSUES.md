# DalkkakAI — Issues / Post-mortems

> **Every bug, friction, surprise, or fix is an asset.** Don't patch and move on — analyze.
>
> Each entry powers later: code reviews, interviews (Amazon SDE II — failure analysis is half of system design), prevention of repeat mistakes, and dogfooding pattern recognition. The cost of writing an entry (10-15 min) is recouped many times over the first time the same class of bug almost recurs.

---

## Protocol — every entry MUST include all 6 sections

```markdown
## YYYY-MM-DD HH:MM — [One-line summary]

### 1. Symptom
What the dogfooder/user observed. Reproduction if possible.

### 2. Root cause
Technical mechanism. The actual *why*, not just "X was wrong."

### 3. Fix
What we changed. Commit hash, files, key diff.

### 4. Was the instruction at fault? (prompt-quality)
- Was the original prompt vague / incomplete / over-specified?
- Did it miss a constraint that, if present, would have prevented this?
- **Score**: [precise] / [partially vague] / [vague] / [N/A — not prompt-driven]

### 5. Was it avoidable? (engineering hindsight)
- Could an experienced engineer have foreseen this?
- Known gotcha (framework / OS / env quirk)?
- True unknown — discovered only by running?
- **Score**: [foreseeable & should have] / [foreseeable but not common knowledge] / [novel / not foreseeable]

### 6. Lessons / Preventive measures
- What specific check / habit / pre-flight catches this class next time?
- Permanent rule? → also append to CLAUDE.md.
- Stack/feature-specific checklist? → note where it lives.
- Prompt-quality lesson for AI-pair coding? → note the wording change.
```

---

## 2026-05-26 — `claude --resume` ~15s startup inside DalkkakAI PTY

### 1. Symptom
- `claude` CLI launched inside the Tauri PTY pane took ~15 seconds before becoming interactive.
- `claude --resume` showed the same lag (worst case — resume triggers more capability queries).
- The same commands ran in ~1-2s in the user's normal terminal (iTerm / macOS Terminal).
- `time echo hello` inside the PTY: instant — so it wasn't a generic read/write delay, only TUI startup paths.

### 2. Root cause
Tauri GUI processes on macOS launch in the windowing system's environment, which is **minimal** compared to a login shell. `TERM`, locale vars, and parts of `PATH` are missing or default.

`portable_pty::CommandBuilder` inherits the parent process env by default, so the spawned bash ran with `TERM` unset (or set to a non-xterm value not in terminfo).

Modern TUIs (Claude Code, vim, neovim, fzf, htop) issue terminal capability queries on startup — `DA1`/`DA2` (Device Attributes), `DECRQM` (mode query), `DSR` (status report). When `TERM` doesn't resolve to a known terminfo entry, the TUI either polls for capabilities or waits for replies that never come, eventually timing out (~10-15s) and falling back to a minimal mode. `claude --resume` was worst-case because resume issues more queries than a cold launch.

### 3. Fix
Commit `1cfebbc` — `apps/desktop/src-tauri/src/pty.rs`:
- `cmd.env("TERM", "xterm-256color")` and `cmd.env("COLORTERM", "truecolor")`.
- Explicitly forward `PATH`, `HOME`, `USER`, `LOGNAME`, `LANG`, `LC_ALL`, `LC_CTYPE`, `TZ`, `SHELL`, `PWD`, `TMPDIR` from the Tauri parent env into the PTY child.
- `cmd.cwd($HOME)` so the shell starts in `~`.
- Guard against `cols=0`/`rows=0` (xterm.js not yet fit on a fast mount) with fallback 80×24.

### 4. Was the instruction at fault?

**Score**: *partially vague.*

Jason's original prompt:
> *"apps/desktop/src-tauri/src/pty.rs 생성 — portable-pty로 bash spawn, stdout을 tauri::Window::emit로 webview에 스트림."*

This was precise about *what* (spawn bash + stream stdout) but said nothing about *production-quality* concerns — env vars, working directory, signal handling, EOF handling. If the prompt had said "production-quality PTY suitable for running interactive TUIs (TERM/env/cwd set correctly)" — or even "must support `claude` and `vim` cleanly out of the box" — the first implementation would have included it.

That said, Jason can't enumerate every gotcha in advance, and a senior implementer should catch this without being told. **Both sides share blame; the AI side carries more.**

### 5. Was it avoidable?

**Score**: *foreseeable & should have been done first time.*

Tauri/Electron env minimalism is a well-known gotcha — every "why doesn't my CLI work inside my Electron app" StackOverflow thread points to it. `portable-pty`'s docs explicitly mention `CommandBuilder::env()`. The first implementation called `CommandBuilder::new(shell)` and relied on inheritance — which works in a terminal-launched process but not a GUI-launched one.

This was an unforced engineering miss, not unknown territory.

### 6. Lessons / Preventive measures

**Permanent rule** — added to `CLAUDE.md` as **RULE #5b** (subprocess env hygiene):
> When spawning any subprocess in a Tauri (or any GUI desktop) app, **never** assume inherited environment is sufficient. Always explicitly set: `TERM=xterm-256color`, `COLORTERM=truecolor`, and forward `PATH`, `HOME`, `USER`, `LANG`, `LC_ALL`, `SHELL`. Set sensible `cwd` (default `$HOME` for terminal panes; per-worktree for project panes later). A "minimal shell" inside a GUI bundle is a different beast from a shell in iTerm.

**For future PTY-related tasks**:
- Add a debug command early: `pty_dump_env` printing the spawned-process env. Catches missing vars during dev in seconds.
- Acceptance test for any PTY pane work: launch `claude`, `claude --resume`, `vim`, `fzf`, `htop` — each should start ≤2s.

**Prompt-quality lesson for AI-pair coding**:
- For *infrastructure* code (PTY, process management, file system, networking), append `"production-quality, handles common gotchas (env vars, cwd, EOF, signals, errors)"` to the prompt. Or attach a per-domain checklist.
- The *first instance* of any new subsystem (first PTY spawn, first IPC handler, first file write) deserves explicit review because it sets the pattern for everything that follows.


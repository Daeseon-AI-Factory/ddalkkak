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


---

## 2026-05-26 — Second pane (after Split/Stack) still shows ~15s delay

### 1. Symptom
- After implementing multi-pane (commit `b76c956`), creating a second pane via "Split" or "Stack" still shows ~15s before the shell prompt appears, even though the first pane (right after env-fix `1cfebbc`) is fast.
- First-pane PTY (initial mount) appears OK; only secondary panes lag.

### 2. Root cause
*Diagnostic pending — user hasn't run the discrimination commands yet:* `echo $TERM` and `time $SHELL -i -c exit` inside the slow pane.

**Hypothesis A (most likely)**: The user's `~/.zshrc` / `~/.bashrc` is slow on init (oh-my-zsh, nvm, pyenv, brew completions, etc.). The first pane's slowness blended into app-startup attention; *every* shell takes this long, but the second pane is the first one noticed in isolation.

**Hypothesis B**: Tauri dev binary cache stale — env-fix not actually applied to the new spawn (user might not have restarted `pnpm tauri dev` after `1cfebbc`).

**Hypothesis C**: Shared lock between concurrent shell inits (history file, completion cache). Unlikely.

### 3. Fix
*Deferred to Step C (tmux integration, this commit).* If A: tmux server starts the shell once and additional panes attach cheaply — the heavy init happens only at first launch. If B: dev session restart resolves. If C: instrumentation needed.

### 4. Was the instruction at fault?
**Score**: N/A — surfaced via dogfooding, not a specific prompt.

### 5. Was it avoidable?
**Score**: *foreseeable but not common knowledge.* The "second pane is slow even after env fix" pattern is a known dogfooding find that exposes shell-init overhead. Worth instrumenting up front: log spawn-to-first-prompt latency to console per pane.

### 6. Lessons / Preventive measures
- **Instrumentation**: add a spawn-to-first-byte timer in `pty.rs` (record `Instant::now()` at spawn, log when first stdout chunk arrives). Surfaces this latency class early.
- **Tmux-first design** (this commit): panes attach to a pre-warmed tmux server, sidestepping per-pane shell init after the first.
- **If still slow after tmux**: ask user to share `time $SHELL -i -c exit` numbers. If their shell genuinely takes ~15s to init, the lesson is "product must pre-warm shells in background, can't blame the user's dotfiles."

---

## 2026-05-26 — Split/Stack kills the running Claude Code session in the source pane

### 1. Symptom
- User has a working pane running `claude` (TUI active, conversation in progress).
- Clicks "Split" or "Stack" toolbar button to create a second pane.
- The original pane's Claude session **terminates** and the pane rerenders with a fresh shell. Work-in-progress lost.
- Both panes are now "fresh" — neither has the prior session.

### 2. Root cause
React + react-mosaic interaction:
- When `setLayout` changes the tree (single leaf → `{direction:"row", first, second}`), the original leaf's *path* changes from `[]` to `["first"]`.
- React reconciliation (via react-mosaic's path-based identity) treats the new `MosaicWindow`/`TerminalPane` as a *different* instance, causing the old `TerminalPane` to **unmount** and a new one to **mount** for the same `id`.
- Unmount fires `useEffect` cleanup → `invoke("pty_kill", { id })` → Rust kills the PTY (and its child shell + claude).
- New mount calls `pty_spawn` for the same id, getting a fresh PTY.
- Net: every split/stack restarts every existing pane.

### 3. Fix
**Step C — tmux integration** (this commit):
- `pty_spawn` now runs `tmux new-session -A -D -s dalkkak-<id>` instead of bare `$SHELL`.
  - `-A`: attach if session named `dalkkak-<id>` exists; create otherwise.
  - `-D`: detach any prior client (the old PTY) so the new client takes over cleanly.
- When `TerminalPane` unmounts and remounts, the underlying tmux session — including the running `claude` process — survives in the tmux server background. The new spawn reattaches and tmux replays scrollback automatically.

Lighter alternative (rejected): keep PTY out of component lifecycle and stop killing on unmount. Would need our own output-buffer + history-replay layer, which is essentially "reinventing tmux." Use tmux.

### 4. Was the instruction at fault?
**Score**: *precise but staged*. Jason's Task #9 description bundled "react-mosaic + tmux persistence." The AI side chose to ship react-mosaic *without* tmux first (Step A+B) and verify multi-pane visually before adding persistence. The split-kill problem surfaced on first dogfood — exactly what incremental delivery is supposed to catch. So not blame-worthy; an *expected discovery*.

### 5. Was it avoidable?
**Score**: *foreseeable.* React + path-based-key reconciliation is well-known. A senior engineer would have foreseen this and either:
- (a) bundled tmux integration in the same commit, or
- (b) at minimum, documented "split/stack will reset panes until tmux lands" in the Step A+B commit message.

The chosen path (Step A+B → discover → Step C) traded one cycle of dogfood-feedback for safer incremental builds. Acceptable but worth naming.

### 6. Lessons / Preventive measures
- **For Mosaic-style layout UIs**, never rely on `useEffect` cleanup to manage long-lived backend resources tied to leaf identity. Use either:
  - (a) external lifecycle — resources persist beyond component mount/unmount (tmux is the cleanest implementation), or
  - (b) explicit "this pane is being destroyed forever" signal (user pressed Close, not just react reconciliation).
- **Prompt-quality lesson**: when bundling "feature + persistence" in one task, *do not split persistence into a later step* unless you're prepared to ship a regression. Persistence-first or simultaneously.

---

## 2026-05-26 — Pane shows `[exited]` / panes appear to share session after Step C

### 1. Symptom
- After Step C (tmux integration, commit `d175811`), splitting panes resulted in `[exited]` appearing in a pane and/or what looked like multiple panes sharing one session.
- User report: *"심각하게 안 되고 있다."*

### 2. Root cause (multi-pronged hypothesis)
1. **tmux binary not resolved on Tauri GUI PATH**: macOS GUI app processes inherit a minimal PATH (`/usr/bin:/bin`). Homebrew installs go to `/opt/homebrew/bin` (Apple Silicon) or `/usr/local/bin` (Intel). Step C's `pty.rs` used `CommandBuilder::new("tmux")` — bare name, PATH-resolved. When that resolution failed, the PTY child *exited immediately and silently*. The user saw `[exited]` (or an empty pane) and we got no diagnostic.
2. **Silent failure pattern**: spawn-time PATH resolution doesn't surface a friendly error; spawn returns "success" because *something* was started (or because the spawn itself fails with a cryptic OS error message that's never displayed).
3. **Potential id collision** (defensive): React strict-mode double-invokes setState callbacks. Our counter-based id generator (`nextIdRef.current++`) was technically safe but a footgun in concurrent rendering. If two leaves ever received the same id, they would attach to the same tmux session — looking like "shared content."

### 3. Fix (commit *current*)
- `pty.rs::find_tmux()` — try absolute path candidates first: `/opt/homebrew/bin/tmux`, `/usr/local/bin/tmux`, `/usr/bin/tmux`, `/opt/local/bin/tmux`. Fall back to `"tmux"` only as last resort.
- `pty.rs::augmented_path()` — prepend `/opt/homebrew/bin:/usr/local/bin` to PATH so subprocesses (claude CLI, tmux itself in its post-fork shell, etc.) can find them.
- `pty.rs` bash wrapper — spawn `/bin/bash -c "<tmux>; if failed: echo error; exec $SHELL"`. tmux failures are now **always visible** + a fallback shell prompt lets the user debug interactively.
- `pty.rs` visible EOF — on `read() → Ok(0)`, emit `\x1b[33m[pane <id> closed]\x1b[0m` (yellow) to the renderer. Silent EOF + frozen pane was the worst possible UX.
- `App.tsx::generateId()` — `pane-<base36-timestamp>-<base36-random>` per leaf. Mathematically collision-proof under rapid clicks + strict-mode invocations.
- `<Mosaic createNode={generateId} />` — react-mosaic's own internal split (e.g., header buttons) now also uses our id generator.

### 4. Was the instruction at fault?
**Score**: *N/A* — surfaced via dogfooding, not a specific prompt.

### 5. Was it avoidable?
**Score**: *foreseeable and should have been done earlier.* Two specific lapses:
- RULE #5b (added 2026-05-26 for the env-var fix) talked about *forwarding* PATH but not *augmenting* it. As soon as the subprocess changed from `$SHELL` (which uses PATH leniently) to `tmux` (a binary requiring strict path resolution), the gap surfaced. Rule needed extension before Step C.
- Step C had no error-visibility plan. Silent failures from a spawn point that can fail in 5+ ways is unacceptable. Should have wrapped in bash from day one.

### 6. Lessons / Preventive measures
- **RULE #5b extended** (CLAUDE.md): when spawning *binaries* (vs. interpreters that resolve PATH internally) from Tauri, **augment** PATH with `/opt/homebrew/bin:/usr/local/bin`, not just forward.
- **RULE #5c added** (CLAUDE.md): any subprocess that can fail must be wrapped with a visible error path. Template: `bash -c "$cmd || (echo 'failed (exit $?)'; exec $SHELL)"`.
- **RULE #5d added** (CLAUDE.md): PTY EOF must emit a visible marker to the renderer (e.g., `[pane closed]` in yellow). Frozen-pane silence is forbidden.
- **Id generators**: always use timestamp + random for cross-mount stability. Counter-based generators are footguns.
- **Acceptance test for PTY work**: split 3+ times; verify each pane unique by id (title); kill a pane; verify visible exit marker; trigger a fail mode; verify visible error message.

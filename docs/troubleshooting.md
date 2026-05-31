# Troubleshooting log

Issues hit and the fix for each. Newest at the bottom.

Format for each entry: **Symptom** · **Cause** · **Fix** · **Commit** · (optional **Pattern**).

When you fix a non-trivial issue, append an entry below. The Stop hook in `.claude/settings.json` reminds about this after any recent commit.

---

## How to add a new entry

```markdown
## <short title>

- **Symptom**: <literal error message or observable behavior>
- **Cause**: <verified explanation> (or `Hypothesis: ... Verified by: ...`)
- **Fix**: <files/functions changed, mechanism>
- **Commit**: <hash from `git rev-parse HEAD` AFTER committing>
- **Pattern**: <one-line recurring lesson — optional>
```

Concrete only. Numbers, file paths, commit hashes.

---

## tmux renders Korean/CJK as underscores in a GUI-launched app

- **Symptom**: `한글 → __` in a pane; English fine.
- **Cause**: Finder/Dock-launched Tauri GUI inherits no `LANG`; `pty.rs` forwarded locale vars only if set, with no UTF-8 default → tmux runs non-UTF-8 and replaces every multibyte char with `_`.
- **Fix**: `pty.rs` — default `LANG`/`LC_CTYPE=en_US.UTF-8` when inherited `LANG` is absent/non-UTF-8 (RULE #5b extended). `terminalRegistry.ts` — add `"Apple SD Gothic Neo"` CJK font fallback.
- **Commit**: `7bd9ac1`
- **Pattern**: GUI-bundle subprocesses need a DEFAULT UTF-8 locale, not just forwarded env (RULE #5b).

## Korean IME leaks raw jamo in the FIRST pane (WKWebView), but works after split

- **Symptom**: first pane at app launch: `안녕 → ㅇㄴㅎ...` (jamo leak); a split pane works fine.
- **Cause** (verified via temp `runtime.log` instrumentation): WKWebView fires NO composition events for a textarea created before its input method is ready → xterm sends every intermediate jamo. Panes created after the webview is ready (split) bind correctly.
- **Fix**: UNRESOLVED — workaround: split to get a working pane. "Recreate terminal once ready, keep PTY" is the right direction but must be once-guarded + tested (an unguarded version regressed split). See `docs/ISSUES.md` 2026-05-30.
- **Commit**: `7bd9ac1` (documents known issue; no code fix for the first-pane case)
- **Pattern**: in WKWebView, IME binds to a textarea only if it's created after the webview is ready; never touch terminal-lifetime code without a once-guard + testing the split path.

## DalkkakAI panes can't `ls` TCC-protected folders (Documents/Desktop), while git capture can

- **Symptom**: `ls: .: Operation not permitted` in `~/Documents/...` inside a pane, while the connective-layer git capture (also the app) reads the same repo fine.
- **Cause** (verified via `pgrep -fl tmux`): panes spawned `tmux new-session -A` on the DEFAULT shared tmux server — a days-old daemon started by another terminal, lacking Documents TCC. Shell commands there inherit that context → denied. Capture runs `git` directly in the app process (which has the access) → works. Different TCC contexts.
- **Fix**: `pty.rs` + `lib.rs` spawn/kill on a DEDICATED server (`tmux -L dalkkak`) → DalkkakAI shells run in a fresh app-started server (correct TCC context) + isolated from the user's other tmux sessions. `src-tauri/Info.plist` adds NS*FolderUsageDescription so the bundled app shows a normal access prompt instead of silent denial (no Full Disk Access).
- **Commit**: `9828c08`
- **Pattern**: a GUI app embedding tmux must use its OWN `-L <name>` server — the default shared server inherits another process's TCC context and entangles the user's sessions.
- **Verify**: rebuild (`pnpm tauri dev`), new pane, `ls` a Documents-based repo (dev); bundled-app prompt at `tauri build`.

## Connective-layer commits showed as raw text — illegible to a non-engineer founder

- **Symptom**: the graph read surface rendered captured commits as raw `fix(pty): …` subjects + a `--stat` blob in the body. Maintainer reaction: *"still text-heavy"*, *"is the graph the same thing as the cards?"*. A React Flow area-grouping was still "a list with lines drawn on it".
- **Cause**: no rendering vocabulary — raw node fields were shown directly. There was no notion of *which* visual a given signal should become.
- **Fix**: viz layer v1 — a workflow-designed `viz_kind` vocabulary (`packages/shared/src/viz.ts`, 10 kinds + schemas; `docs/VIZ_VOCABULARY.md`), five Framer-Motion renderers (`apps/desktop/src/viz/{Concept,Plan,Recap,Question,Mermaid}Card.tsx`), and `ActivityView` rendering REAL commits through `recap` (`nodeToRecap.ts`, factual only — no invented next_step / change verbs). Mermaid token-themed + zoom/pan; typed i18n (`apps/desktop/src/i18n`, English default).
- **Commit**: `97a3654`
- **Pattern**: for a non-engineer surface, never show raw model/VCS fields — map every signal onto a small LOCKED vocabulary of glanceable renderers, and keep universal escape hatches (`mermaid` for any structure, `concept` for any unknown term) so novel inputs still render. Density is good; distortion is never. Build it and let the user *see* it — every "is this too much?" is answered fastest by a real render, not a paragraph.
- **Verify**: `pnpm -C apps/desktop typecheck && pnpm -C apps/desktop build` (green); in-app 📊 Graph → Activity / Cards / Flow.

## Per-session live status can't be scraped from Claude Code's TUI reliably

- **Symptom**: the live status strip (Layer 1) appeared on ONE pane ("working") but not on two other panes clearly running Claude — even though those panes showed "Worked for 7s" right on screen. The working pane's tool name was itself a misparse: "Yourhomedirectory", from the prose line "Your home directory (".
- **Cause** (observed across 3 real panes, with screenshots): `StreamParser.feed` (`packages/augmentor`) splits PTY output on `\n` and matches whole lines. Claude Code's TUI paints its spinner/status ("Crunched for 1s", "Worked for 7s") by REPAINTING in place (cursor moves / carriage returns), not by emitting newline-terminated lines — so those updates never reach the parser as parseable lines. Whether a pane lights up is luck-of-the-draw on whatever prose happens to be flushed as a clean line; the in-place repaints (the actual status) are invisible to a line parser.
- **Fix**: a direction, not a patch. Broadening the line patterns (added "<Word> for <N>s" + "esc to interrupt" to `packages/augmentor/src/index.ts`) does NOT help — the lines never arrive. The reliable path is Claude Code **hooks** (structured events on tool start/stop, prompt, stop) correlated to a pane via an injected `DALKKAK_PANE_ID` env var. The sibling `viz-agents` project used the same approach (`install_hooks.py`).
- **Commit**: `04b995e` (ships Layer 1 as a known-unreliable stopgap; hooks are the real fix, next)
- **Pattern**: never derive program state by scraping a full-screen TUI's byte stream — TUIs repaint in place, so a line parser sees only a fraction of what's on screen. Use the program's structured event channel (hooks / IPC), not its rendered output.

## Tauri app SIGABRT at launch — `tokio::spawn` inside the `setup` closure

- **Symptom**: "DalkkakAI quit unexpectedly" immediately on launching the installed release build. `runtime.log` showed `tracing initialized` + `DalkkakAI starting` but **never** `tauri app setup complete` → it died *inside* `setup`. The macOS crash report (`~/Library/Logs/DiagnosticReports/appsdesktop-*.ips`) showed `Abort trap: 6` (SIGABRT) on the main thread with `std::process::abort` in the stack.
- **Cause**: a newly-added `hooks::spawn_watcher` called `tokio::spawn(...)` inside Tauri's `.setup()` closure. That closure runs on the main thread with **no entered tokio runtime**, so `tokio::spawn` panics ("must be called from the context of a Tokio runtime") → panic → abort. `capture::spawn_worker` (which worked) uses `tauri::async_runtime::spawn`, which carries Tauri's runtime handle and needs no entered context.
- **Fix**: `hooks.rs` — `tokio::spawn` → `tauri::async_runtime::spawn`. The inner `tokio::time::interval` still works (the future runs on Tauri's tokio). Smoke-tested: the binary now stays alive past setup and spawns panes.
- **Commit**: `c5bc1b1`
- **Pattern**: in a Tauri `setup` closure always use `tauri::async_runtime::spawn`, never raw `tokio::spawn` — there is no entered runtime there. And: a crash that dies in `setup` is pinpointed in seconds by the *absence* of the `setup complete` log line + the crash report's abort frame — no guesswork needed (this is the two-layer logging earning its keep; see `content/logs/dalkkak-ai/2026-05-30-logging-loop-first-save.mdx`).

## Layer 2 "✨ Summarize" via `claude -p` is too slow for a button (~22–54s)

- **Symptom**: clicking ✨ Summarize shows "요약 중…" for 20–50s before the card appears — feels stuck/broken. The card *content* is good once it arrives (the workflow-designed prompt picks the right kind, plain language).
- **Cause** (measured, not guessed): the latency is the `claude -p` **API call itself, not boot**. With `--strict-mcp-config` (MCP off) + `--model claude-haiku-4-5` + subscription auth, `duration_api_ms ≈ duration_ms`: **≈22.9s for a 3000-char transcript, ≈54.1s for 12000 chars** — boot is negligible, the API time dominates and scales with input size. A tiny prompt returns in ~1.8s, so it's input-token volume that's slow — *abnormally* so for haiku. Beyond "it's the API call, scaling with input," the deeper cause is **UNVERIFIED**. Hypotheses: account rate-limited from heavy same-day use; low throughput on the subscription `claude -p` path; or prompt-cache-creation latency (`input_tokens` reported as 10 with the bulk in `cache_creation_input_tokens`). **Verify by**: re-test on a rested account, or a direct haiku API call with identical input.
- **Fix**: NOT resolved. `--strict-mcp-config` removed boot cost but the API time is the blocker. The decision (ADR-002, on-demand `claude -p`) needs revisiting — likely a direct haiku API call (fast, needs a valid key) or async/background summarization with progress. Tracked in `docs/DECISIONS.md` ADR-002.
- **Commit**: `753881b`
- **Pattern**: before committing a CLI-spawn (`claude -p`) for an INTERACTIVE feature, measure end-to-end latency on REAL input — a one-shot CLI that boots an agent + makes a network call can be 20–50s (fine for batch, not for a button). Always split boot vs API time (`duration_ms` vs `duration_api_ms`) so you attack the right half.

## A PATH-prepended `claude` wrapper is bypassed by the user's rc → use a shell function

- **Symptom**: a DalkkakAI-only `claude` wrapper placed on the pane's PATH (to inject `--append-system-prompt`, ADR-003) never ran — typing `claude` in a pane still hit the real binary, so no `<dk-summary>` block.
- **Cause**: PATH set on the spawning bash doesn't reliably reach the interactive zsh inside the tmux session, and — decisively — that zsh re-runs `~/.zshrc`, which does `export PATH="$HOME/.local/bin:$PATH"`, prepending the dir holding the REAL `claude` **ahead** of our wrapper dir. PATH order → real binary wins.
- **Fix**: a shell **function** instead of a PATH shadow — `claude() { command claude --append-system-prompt "$(cat …/dk-directive.txt)" "$@"; }`. Functions resolve **before** PATH, so it wins regardless of rc ordering. Installed by the app (`inline::ensure_shell_function`) **append-only** (never rewrites the user's file), **backed up** to `~/.zshrc.dalkkak-bak`, **idempotent** (marker), **guarded by `DALKKAK_PANE_ID`** (DalkkakAI panes only). `command claude` inside the function calls the real binary (no recursion).
- **Commit**: `fad4738`
- **Pattern**: to reliably intercept a command in an interactive shell, **override it with a function** (beats PATH), not a PATH-shadow binary — the user's rc can re-order PATH at will, but a function defined by that same rc wins. And when editing a user's shell profile: APPEND-ONLY + backup + idempotent marker + a scope guard — never parse/rewrite, so it can't corrupt.

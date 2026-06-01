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

## In-line `<dk-summary>` block leaks into the terminal — stripping the interactive TUI stream is unreliable (same wall as ADR-001)

- **Symptom**: with the in-line self-summary live (ADR-003), the model's summary JSON appears **raw in the pane** at the end of each reply (e.g. `{"kind":"note","data":{…}}`), and the ✨ card box is **empty** — the opposite of "the block is hidden, the card is shown".
- **Cause** (verified against the transcript): the model DOES emit a clean `<dk-summary>{json}</dk-summary>` block — the session transcript JSONL contains exactly one, well-formed. But the app captures + strips from the **interactive TUI byte stream**, and Claude Code's TUI mangles it (angle-bracket markers handled as markup / split by cursor-redraws + ANSI), so `SummaryStripper`'s literal-substring match fails: the markers don't match cleanly, the JSON passes through (leak), and the partial/garbled capture isn't valid JSON (empty card). This is **the exact unreliability that retired TUI scraping for status in ADR-001** — re-introduced for the summary.
- **Fix**: NOT resolved. The reliable source is the **transcript file** (clean block), not the rendered stream — read the latest `<dk-summary>` from `transcript_path` (a Stop hook already gives us that path) rather than parsing xterm output. Hiding the block from the visible TUI is the remaining open question (a model can only emit into its response). Tracked in `docs/DECISIONS.md` ADR-003.
- **Commit**: (finding only; fix pending)
- **Pattern**: anything you need to read from Claude Code must come from its **structured channels** (hooks, transcript JSONL), NEVER from the rendered TUI byte stream — the TUI repaints + injects ANSI, so literal parsing is luck. We learned this once (ADR-001) and must apply it everywhere, including capture, not just status.

## RESOLVED — read the summary card from the transcript file; drop the stream stripper (ADR-004)

- **Symptom**: (closes the entry above) the ✨ card was empty + the `<dk-summary>` JSON leaked into the pane, because capture/stripping ran on the mangled interactive TUI stream.
- **Cause**: confirmed — the *transport* was wrong, not the idea. The transcript JSONL holds the model's text un-mangled; the xterm byte stream does not.
- **Fix**: `summarize.rs::read_inline_summary` reads `transcript_path` from the end, finds the last assistant text block containing `<dk-summary>…</dk-summary>` (`extract_block`), returns its `{kind,data}` — instant, free, reliable (a file read, no model call; also retires the ADR-002 ~22–54s `claude -p` latency for this path). The stream stripper was **removed** (`terminalRegistry.ts` now writes raw PTY bytes to xterm); the visible JSON leak is **accepted** by the maintainer ("JSON이 화면에 뜨는 거 자체는 그럴 수 있을 것 같은데") — a model can only emit into its own reply, so a clean hide isn't possible without the unreliable stripping. Card renders in a centered portal popup (`SummaryModal.tsx`) with a new `note` renderer (`NoteCard.tsx`) and the source pane outlined red.
- **Commit**: `542d657`
- **Pattern**: when intercepting a model's output is unreliable, stop intercepting — read the **artifact it already wrote to a structured file** (transcript JSONL), and accept the cosmetic cost (a visible block) rather than fighting the rendered stream. Third application of ADR-001's "structured channels only" law (status → capture → summary).

## Per-session token usage: real numbers from the transcript, but no `$` — never fabricate a dollar figure

- **Symptom**: wanted to show "how much did this session cost" per session in the ✨ popup. The obvious instinct is a dollar amount.
- **Cause**: the transcript's per-assistant-message `message.usage` carries real `input_tokens` / `output_tokens` / `cache_read_input_tokens` / `cache_creation_input_tokens`, but there is **no `costUSD` field**, and the maintainer runs on a **Max subscription** — there is no per-token bill at all. Any `$` shown would be invented (an API-equivalent price the user never pays). Measured on a live session: input ~40k, output ~1.6M, cache_read ~305M — cache_read dominates but is near-free, so **output** is the only meaningful effort signal.
- **Fix**: `summarize.rs::session_usage` sums the four token fields + message count across all assistant lines; the popup (`SummaryModal.tsx` `UsageBar`) shows `output / input / cache / turns` with the explicit note "tokens — not a $ bill (subscription)". No dollars rendered.
- **Commit**: `542d657`
- **Pattern**: report only numbers the source actually contains. When the honest metric (tokens) isn't the one the user first asked for ($), show the real one with a one-line caveat — never synthesize a plausible figure (a fake `$` on a subscription) to satisfy the question's framing.

## "This turn" token usage: tool-result messages are also `type:"user"`, so naive turn-boundary detection is wrong

- **Symptom**: needed to show the CURRENT turn's tokens (not just the session total). First instinct — "take the last assistant message" or "sum back to the last `type:"user"` line" — both wrong.
- **Cause** (verified on a real 4159-line transcript): one user turn produced **47 assistant messages** (a turn with many tool calls emits one assistant message per round), so "last message only" undercounts by ~40×. And the cut-to-last-`type:"user"` approach fails too: Claude Code records **tool results as `type:"user"`** as well (content is an array carrying a `tool_result` block), so the real turn boundary is *not* the last user-typed line. Measured: real last prompt at line 4033, the turn's summed output was 77.9k across those 47 messages.
- **Fix**: `summarize.rs::is_user_prompt` treats a line as a real prompt only if `type=="user"` AND content is a string (or an array with NO `tool_result` block). `session_usage` finds the last such line and sums assistant usage after it into `turn`, everything into `session`; returns `{session, turn}`. The popup shows both rows (cache only on the session row).
- **Commit**: `4c2445a`
- **Pattern**: in a Claude Code transcript, `type:"user"` is NOT a reliable "human turn" marker — tool results wear the same type. To segment by human turn, test the content shape (string / text-only array = real prompt; array-with-tool_result = machine). Always validate turn-segmentation against a real multi-tool transcript, where one prompt fans out to dozens of assistant messages.

## Usage Pulse: the design spec was wrong about the hook line shape — verify the real artifact, not a code-derived guess

- **Symptom**: the (otherwise excellent, code-verified) Usage Pulse synthesis asserted the product hook line is `{pane,event,tool,tpath}` with **no `cwd` and no timestamp**, and built the whole startup-attribution + cold-start story around that gap (attribute via the *transcript's* cwd because "the hook has none"; block history "can't backfill").
- **Cause**: that claim was derived from `sessionStatus.ts::applyHookEvent`, which only *parses* `{pane,event,tool,tpath}` out of the line — but the hook *writes* more than the renderer reads. Inspecting the actual `~/Library/Application Support/DalkkakAI/session-events.jsonl` shows every line is `{"pane","event","tool","cwd","tpath","ts"}` — it **has** both `cwd` and a unix-epoch `ts`. The renderer just ignores those two fields.
- **Fix**: `pulse.rs` attributes hook events directly by their own `cwd` and buckets them by `ts` (local tz), and scopes the whole rollup to the **set of `tpath`s seen in the hook log** (= DalkkakAI-run sessions), so the user's unrelated global Claude usage never pollutes the numbers. Transcript `cwd` is still used for the transcript-derived half. Verified end-to-end on real data (throwaway test): correct attribution (`startup-ddalkkak` vs `unassigned`), GraphStore commit join (25/1 per real startup), local-tz days, blocks/turns/tool-mix all populated.
- **Commit**: `e34790b`
- **Pattern**: a parser that reads a subset of a file's fields is NOT evidence of the file's full shape. Before designing around "field X doesn't exist", read the real artifact (`tail` the actual JSONL), not the code that happens to consume it — the writer and the reader can disagree, and here the cheaper, more-reliable attribution key (`cwd` on the hook line itself) was sitting unused the whole time.

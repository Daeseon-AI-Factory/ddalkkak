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

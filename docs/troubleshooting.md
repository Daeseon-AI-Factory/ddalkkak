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
- **Commit**: `<HASH-korean>`
- **Pattern**: GUI-bundle subprocesses need a DEFAULT UTF-8 locale, not just forwarded env (RULE #5b).

## Korean IME leaks raw jamo in the FIRST pane (WKWebView), but works after split

- **Symptom**: first pane at app launch: `안녕 → ㅇㄴㅎ...` (jamo leak); a split pane works fine.
- **Cause** (verified via temp `runtime.log` instrumentation): WKWebView fires NO composition events for a textarea created before its input method is ready → xterm sends every intermediate jamo. Panes created after the webview is ready (split) bind correctly.
- **Fix**: UNRESOLVED — workaround: split to get a working pane. "Recreate terminal once ready, keep PTY" is the right direction but must be once-guarded + tested (an unguarded version regressed split). See `docs/ISSUES.md` 2026-05-30.
- **Commit**: `<HASH-korean>` (documents known issue; no code fix for the first-pane case)
- **Pattern**: in WKWebView, IME binds to a textarea only if it's created after the webview is ready; never touch terminal-lifetime code without a once-guard + testing the split path. No "lessons learned" essays.

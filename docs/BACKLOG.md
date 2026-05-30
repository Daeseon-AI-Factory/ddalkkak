# DalkkakAI — Backlog (deferred items)

> Things that aren't shipping right now but **must not be forgotten**.
> Sources: ISSUES.md (deferred fixes), dogfood notes, user requests, planned-but-not-scheduled work.

## Protocol

When you encounter an item that fits this file:
- An `ISSUES.md` entry resolved-by-deferral → copy summary here with the 3-field template.
- A dogfood-time annoyance that doesn't block today's work → here, not `ISSUES.md`.
- A feature idea outside the current phase → here.
- A "nice to have" from any conversation → here.

**Rule**: never let a deferred item live only in chat memory. This file is the bucket.

### Entry template
```markdown
### [Title]
- **Why deferred**: ...
- **Trigger to revisit**: ...
- **Effort estimate**: ...
- **Source**: ISSUES.md / dogfood note / user request / BLUEPRINT.md / ...
```

---

## Performance

### Pre-warm PTY shells (fix second-pane ~15s startup)
- **Why deferred**: Root cause is the user's shell init (~/.zshrc + oh-my-zsh + nvm + pyenv + brew completions), not our PTY bridge. The user can optimize their dotfiles to get the gain immediately (lazy-load nvm alone usually drops 8-10s).
- **Trigger to revisit**: (a) Dogfood week confirms it's a daily frustration even after user-side .zshrc opt; OR (b) post-launch, multiple users report the same pain.
- **Effort estimate**: ~3-4 hours — background warmup pool (1-2 pre-spawned tmux sessions), swap-on-spawn logic, tests.
- **Source**: `ISSUES.md` 2026-05-26 (second-pane delay + follow-up).

### "Fast shell" toggle (skip ~/.zshrc, spawn `bash --norc`)
- **Why deferred**: Niche. Most users want their full env. Only relevant if a user explicitly opts for a bare shell.
- **Trigger to revisit**: User request, OR pre-warm above ships and people want an alternative.
- **Effort estimate**: ~1 hour — UI toggle (per pane?) + `--norc` branch in `pty.rs`.
- **Source**: `ISSUES.md` 2026-05-26 follow-up.

---

## UX

### Korean/CJK IME broken in the FIRST pane (WKWebView), works after split
- **Why deferred**: Genuinely hard WKWebView issue — it fires no DOM composition events for a textarea created before its input method is ready, so the launch pane never binds IME (Korean leaks as raw jamo). A workaround exists (split → freshly-bound pane). A first attempt (recreate terminal once ready) regressed split and was reverted.
- **Trigger to revisit**: (a) Korean/CJK input becomes real daily friction in dogfood; OR (b) before any non-Jason release.
- **Effort estimate**: ~half a day — recreate the launch pane's xterm once the webview is ready (keep the PTY/tmux session), ONCE-guarded, with the split/remount path tested.
- **Source**: `docs/ISSUES.md` 2026-05-30 (Korean/CJK input post-mortem).

### Pane navigation (intra-pane, vim-style ⌘⌥arrows)
- **Why deferred**: Phase 1.4+ scope; click-based focus works fine for now.
- **Trigger to revisit**: Dogfood reveals "I need vim-style focus motions".
- **Effort estimate**: ~30 min.
- **Source**: `SHORTCUTS.md` "Planned" section.

> *Resolved 2026-05-26*: startup-level shortcuts (`⌘1..9`, `⌘⇧[`, `⌘⇧]`) were pulled forward from Task #15 into Task #10 after user reported friction during dogfood. See `SHORTCUTS.md` "Startup navigation" section.

### Pane number badges (show 1/2/3 corners)
- **Why deferred**: Helps with future ⌘1..9 shortcut. Tmux index style.
- **Trigger to revisit**: When pane nav shortcuts land.
- **Effort estimate**: ~20 min.
- **Source**: derived from ⌘1..9 plan.

---

## Persistence

### Layout JSON persistence + reattach on launch (Phase 1.3+ Step D + E)
- **Why deferred**: Tracked as Task #13. Not blocking single-session daily use.
- **Trigger to revisit**: Right after dogfood validates Phase 1.3 multi-pane.
- **Effort estimate**: ~1-2 hours.
- **Source**: Task #13 + `BLUEPRINT.md` Phase 1.3.

---

## Build / distribution

### macOS code signing (Apple Developer account)
- **Why deferred**: Phase 4 (Beta release) prerequisite. Personal-use builds work unsigned.
- **Trigger to revisit**: Before publishing to non-Jason users.
- **Source**: `BLUEPRINT.md` Open Questions.

### Tauri auto-updater CDN (Cloudflare R2)
- **Why deferred**: Phase 4. Single-user builds use manual reinstall.
- **Source**: `BLUEPRINT.md`.

### `pnpm typecheck` script in apps/desktop/package.json
- **Why deferred**: Trivial; Tauri scaffold didn't ship one. Currently `pnpm typecheck` at root errors with "script not found" for apps/desktop workspace.
- **Trigger to revisit**: Next CI / lint setup.
- **Effort estimate**: 1 minute.
- **Source**: noted during Phase 1.3 commits.

---

## Operate layer (Phase 3 scope)

- **Cross-startup uptime monitoring** — `BLUEPRINT.md` Phase 3
- **Advisor daily summary** (cloud advisor agent using user's Claude key) — `BLUEPRINT.md` Phase 3
- **Architecture viz auto-generation** from code — `BLUEPRINT.md` Phase 3 + packages/viz

---

## Long-term (Phase 4+)

- **Skills marketplace** with revenue share (Jason's Claude Code know-how → published skill packs)
- **Mobile / tablet** companion view
- **Multi-tenant** cloud workspace (Firecracker-style isolation required)
- **Cursor/Claude.ai chat surface** integration inside panes
- **In-pane code editor** (Monaco) for Cursor replacement

### Migrate persistence off render-driven useEffect to a dedicated store (Zustand/Jotai)
- **Why deferred**: Two `useEffect`-based persistence races have already burned us in Phase 1.3-1.4. A render-decoupled store (Zustand, Jotai, valtio) owns lifecycle explicitly — set commits immediately, no useEffect ordering footguns.
- **Trigger to revisit**: A third race in this class, OR when the layout/startup state grows beyond 2 keys.
- **Effort estimate**: ~2-3 hours (introduce store, port load/save/seed paths, drop the load/save effects).
- **Source**: `ISSUES.md` 2026-05-26 (new-startup-lost race) + earlier layout-persistence work.

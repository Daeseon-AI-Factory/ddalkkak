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

### Pane navigation shortcuts (⌘1..9, ⌘⌥arrows)
- **Why deferred**: Phase 1.4+ scope.
- **Trigger to revisit**: Dogfood reveals "I need to nav between panes faster than click".
- **Effort estimate**: ~30 min (id-by-index lookup + keyboard listener).
- **Source**: `SHORTCUTS.md` "Planned" section.

### Multi-startup sidebar shortcuts (⌘⇧[ / ⌘⇧])
- **Why deferred**: Part of Phase 1.4 (Task #10).
- **Source**: `SHORTCUTS.md`.

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

# DalkkakAI — Keyboard Shortcuts

> Canonical list. Updated whenever new shortcuts land.
> Pattern follows 50-year industry standard (Emacs → iTerm → VS Code → Warp).

---

## Pane control — `⌘` Command (focus-based)

| Shortcut | Action | Source |
|---|---|---|
| `⌘D` | Split focused pane horizontally (new pane to the right) | iTerm2 / Warp / WezTerm convention |
| `⌘⇧D` | Stack focused pane vertically (new pane below) | iTerm2 extension |
| `⌘W` | Close focused pane (destroys xterm + PTY + tmux session) | macOS-wide convention |
| `⌘1` .. `⌘9` | Focus pane by index within the current startup | Arc-style (⌘ = within-space) |
| `⌘[` / `⌘]` | Focus previous / next pane (wraps around) | Arc-style |
| `⌘I` | Summarize focused pane (✨ popup) — Info / Insight | DalkkakAI |
| `Esc` | Close the summary popup | Universal |
| **Mouse click** on any pane | Move focus to that pane (blue 2px outline shows focus) | Universal |

## Startup navigation — `⌃` Control (sidebar)

| Shortcut | Action | Source |
|---|---|---|
| `⌃1` .. `⌃9` | Switch to startup by sidebar index (1 = first, 2 = second, ...) | Arc-style (⌃ = across-spaces) |
| `⌃Tab` | Next startup (wraps around) | browser tab convention |
| `⌃⇧Tab` | Previous startup (wraps around) | browser tab convention |

> New pane created by Split/Stack **automatically gets focus** — matches iTerm/VS Code behavior.
> **The Arc split:** `⌘` (Command) always stays *within* the current startup (panes); `⌃` (Control) moves *between* startups — like Arc browser's tabs vs spaces.

---

## Inside a focused pane (xterm passthrough)

Standard terminal shortcuts work — xterm.js forwards them to the underlying shell:

| Shortcut | Action |
|---|---|
| `⌃C` | Interrupt (SIGINT) |
| `⌃D` | EOF (close shell stdin) |
| `⌃L` | Clear screen |
| `⌃R` | Reverse history search (bash/zsh) |
| `⌃A` / `⌃E` | Cursor to start / end of line |
| `⌃U` / `⌃K` | Delete to start / end of line |

> `⌘D` (split) is captured at window level, *before* it reaches xterm. Inside a pane, only `⌃D` (control-D) reaches the shell as EOF.

---

## tmux passthrough (inside the pane)

Each pane is backed by a tmux session named `dalkkak-<pane-id>`. Standard tmux prefix `⌃B` works inside the pane if you want sub-splits or scrollback:

| Shortcut | Action |
|---|---|
| `⌃B "` | Native tmux split horizontal (inside one DalkkakAI pane) |
| `⌃B %` | Native tmux split vertical (inside one DalkkakAI pane) |
| `⌃B [` | Enter scrollback mode (arrows / vim motions to scroll) |
| `⌃B q` | Quit scrollback mode |
| `⌃B d` | Detach from session (DalkkakAI's pane closes; tmux session survives until app restart) |

> You can mix DalkkakAI's outer splits (`⌘D`) with tmux's inner splits (`⌃B "`). Useful for advanced layouts.

---

## Planned (future)

| Shortcut | Action | When |
|---|---|---|
| `⌘⌥→ ← ↑ ↓` | Move focus to neighbor pane (vim-style) | Phase 1.4+ |
| `⌘N` | New startup | Phase 1.4 |
| `⌘,` | Settings | Phase 2 |
| `⌘K` | Command palette (search panes / startups / actions) | Phase 2 |

---

## Why these shortcuts?

48-year industry convention. If you've used Emacs (`C-x 2`/`C-x 3`), vim (`:split`), tmux (`⌃B "`/`%`), iTerm2 (`⌘D`/`⌘⇧D`), VS Code (`⌘\\`), or Warp — DalkkakAI's pattern is **the same**. New users coming from any of those tools are immediately fluent.

See `docs/MILESTONES.md` 2026-05-26 (focus-based split entry) for the reference list.

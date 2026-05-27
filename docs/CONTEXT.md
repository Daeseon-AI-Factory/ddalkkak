# DalkkakAI — Current Situation (for second-opinion review)

> 다른 LLM, 멘토, founder에게 *현재 상황 + 결정해야 할 open question*을 한 번에 paste하기 위한 self-contained 문서. 2026-05-27 기준.

---

## 1. What DalkkakAI is

**Mission** (per `BLUEPRINT.md`):
> "솔로 indie hacker가 본인 Claude Code/Codex로 *여러 service를 동시에 만들고 운영*하는 native desktop workspace OS."

Core principles:
- **BYO AI** — we don't call Claude API. Users plug in their own Claude Code/Codex.
- **Native desktop** (Tauri 2.x, Rust backend). ~10MB binary, 30-80MB memory.
- **Multi-startup first-class** — N startups in one workspace, not per-project.
- **Built for the founder (Jason) first** — scratch-your-own-itch.

One-line category: *"Lightweight native multi-pane terminal multiplexer + Claude Code augmentation platform for solo indie hackers running multiple startups."*

---

## 2. Stack (~600 lines ours / ~hundreds-of-thousands theirs)

**Borrowed** (industry-standard, gluing existing primitives):
- Tauri 2.x + Rust 1.95 + macOS WebKit
- portable-pty (Rust crate; Warp/WezTerm use it too)
- tmux 3.6 (system daemon; 39-year-validated session backend)
- xterm.js 6 (VS Code's terminal renderer)
- React 19 + Vite + TypeScript
- react-mosaic-component 6.1.1 (layout tree — pinned after v7 beta API break)
- localStorage (persistence)

**Built (us)** — ~600 lines code + ~2,000 lines docs:
- `apps/desktop/src-tauri/src/pty.rs` (~170 lines): PTY backend, env hygiene, bash wrapper, visible-EOF marker
- `apps/desktop/src-tauri/src/lib.rs` (~133 lines): 5 Tauri commands keyed by pane id + tracing init
- `apps/desktop/src/terminalRegistry.ts` (~120 lines): xterm+PTY lifecycle OUT of React (VS Code Server pattern)
- `apps/desktop/src/App.tsx` (~310 lines): Mosaic layout + Sidebar + persistence + shortcuts
- `apps/desktop/src/Sidebar.tsx`, `startups.ts`, `App.css`
- Docs: BLUEPRINT, MIGRATION_PLAN, MILESTONES, ISSUES, BACKLOG, SHORTCUTS, STACK, CLAUDE rules

Honest analogy: *Michelin chef buying tomatoes at the market — the recipe is the value, not growing the tomatoes.*

---

## 3. Progress (multi-day sprint, ~40 commits as of 2026-05-27)

```
Phase 1.0 ✅ Tauri scaffold
Phase 1.2 ✅ Single PTY pane (portable-pty + xterm.js + Tauri events)
Phase 1.3 ✅ Multi-pane (react-mosaic) + tmux persistence
        ✅ Lifecycle decouple (xterm+PTY out of React)        ← the real win
        ✅ Layout persistence (localStorage) + auto-reattach (tmux daemon)
Phase 1.4 ✅ Multi-startup sidebar + per-startup layout
        ✅ Race-condition fix (sync-seed pattern)
        ✅ Startup shortcuts (⌘1..9, ⌘⇧[, ⌘⇧])
Phase 1.5 ⏳ 1-week dogfood test (NOT started)
Phase 2-4 ⏳ Augmentation / operator layer / marketplace (NOT built)
```

**6 ISSUES.md post-mortems** (each 6 sections: symptom / root cause / fix / prompt-blame / avoidability / lessons). Bug-as-asset culture.

**5 MILESTONES.md entries**, each in 3 tones (🔧 Engineering / 💬 Raw / 📣 Marketing) for reuse in interviews / blog / pitch.

---

## 4. Honest differentiation assessment

### What's actually built — differentiation is WEAK

| Feature | Built | Differentiated? |
|---|---|---|
| Multi-pane terminal | ✅ | ❌ (Warp/iTerm/tmux already) |
| Focus split + shortcuts | ✅ | ❌ (iTerm 50-year convention) |
| Layout persistence | ✅ | ❌ (tmux native) |
| Multi-startup sidebar | ✅ | 🟡 Mild (BridgeMind=per-project, Warp=none) |
| Tauri (~10MB vs Electron ~150MB) | ✅ | 🟡 Mild (does the user notice?) |
| BYO Claude Code (no token markup) | ✅ | 🟡 Mild marketing angle |

**Current product = "Tauri-built lite multi-pane terminal with multi-startup sidebar."** That's all.

### Real wedges are in Phase 2-4 — NOT BUILT YET

| Future wedge | Strength | Built |
|---|---|---|
| Claude Code output augmentation (parse "Tool: edit X" → friendly UI, skills auto-inject) | 🟢🟢 Very strong | ❌ 0 lines |
| Multi-startup operator layer (cross-startup uptime / advisor agent / architecture viz) | 🟢🟢 Very strong | ❌ 0 lines |
| Skills marketplace (Jason's Claude Code know-how → published skill packs) | 🟢 Strong | ❌ 0 lines |

**Real differentiation lives in vapor right now.**

---

## 5. Market context

| Competitor | Position | Vs us |
|---|---|---|
| **BridgeMind / BridgeSpace** | Same philosophy, Electron, per-project, 10K+ Discord, V3 shipped | Ahead. Cloud-augmented native is similar; multi-startup not present |
| **Warp Terminal** | Series A funded, ~50 employees, modern Rust terminal | Way ahead in budget; single-context per window |
| **Cursor** | AI-codegen editor, prominent | Different category (editor not terminal) |
| **VS Code Server / Codespaces / Coder** | Cloud IDE | Different category (editor + cloud) |
| **tmux (1987)** | Power-user CLI session daemon | We use it inside |
| **Lovable / Bolt / v0** | AI-codegen "describe → app" | Different category (own AI inference) |
| **DalkkakAI** | Solo, 24h dev, Phase 1 ~80% | Behind by funding, ahead by focus |

---

## 6. Founder context (relevant)

- Jason: solo Korean dev/founder. Korean primary language; English readable but slow on dense tech text.
- **Parallel track**: actively preparing for Amazon SDE II interview. The 24h work has direct portfolio + system-design-interview value regardless of product fate.
- Currently runs **~12 macOS desktops simultaneously** for daily multi-product work. Wants to consolidate to one app. *Scratch-your-own-itch is the strongest motivator.*
- **Java platform** (separate repo, in development) handles billing / rate-limit / quota for all Jason's products via REST. DalkkakAI consumes it. Per-product code stays lean.
- BLUEPRINT says ₩10B ARR. Realistic frame is "scratch own itch + portfolio + maybe-niche-product, not unicorn."

---

## 7. The open question (what we want a second opinion on)

**Given that:**
- ~80% of Phase 1 done in 24h, engineering quality is high (4-layer race fix, lifecycle decouple, 6 post-mortems documented)
- Real product differentiation lives in Phase 2-4 (each 2-3 months further work)
- BridgeMind and Warp are ahead with funding + community
- Amazon SDE II interview is a parallel high-leverage path (this work is already strong portfolio)
- Jason is solo, in Korea, with limited time

**Which strategic path is honestly highest-leverage right now?**

1. **Phase 1.5 dogfood for 1 week** → use the current build daily → if real value found, continue to Phase 2 augmentation
2. **Stop the product, use this 24h work as Amazon SDE II portfolio** → existing artifact is solid system-design material
3. **Pivot to narrower category** → "Claude Code multi-instance orchestrator" instead of "tmux GUI" (smaller TAM but real wedge)
4. **Pivot to different wedge** → Skills marketplace standalone, or Jason's Java platform productized
5. **Build Phase 2 augmentation immediately** without dogfood → bet on the real wedge directly

We have honest engineering muscle and 24h proof. What's the actual highest-leverage move from here? Don't be sycophantic — *brutal honesty is preferred*. Past flattery only wasted time.

---

## 8. Repo

- GitHub: `github.com/Daeseon-AI-Factory/ddalkkak` (~40 commits pushed as of 2026-05-27, v0.1.0 tag pushed)
- Local: `/Users/daeseonyoo/Documents/GitHub/ai-product/ddalkkak`
- Recommended reading order for a deep reviewer:
  1. `docs/BLUEPRINT.md` — canonical product reference
  2. `docs/STACK.md` — what's ours vs borrowed
  3. `docs/MILESTONES.md` — 24h timeline (3-tone log)
  4. `docs/ISSUES.md` — 6 post-mortems
  5. `docs/BACKLOG.md` — deferred items
  6. `docs/SHORTCUTS.md`, `CLAUDE.md` — operating manual

---

**Please review and answer Section 7 with maximum honesty.** No sycophancy. Tell us what you'd actually do in Jason's shoes.

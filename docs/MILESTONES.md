# DalkkakAI — Milestones (3-tone log)

> Every significant step (task completion, major commit, architectural decision, milestone) gets recorded in **three tones**, so Jason can reuse the same step for different audiences later:
>
> - 🔧 **Engineering** — what was technically done, decisions, gotchas. **For:** Amazon SDE II interviews, code reviews, system design talks, technical blog posts.
> - 💬 **Raw** — honest founder voice. What really happened, how it felt, what almost broke. **For:** friends, Discord chats, journaling, candid behind-the-scenes blog posts.
> - 📣 **Marketing** — external-facing talking points, taglines, comparisons. **For:** Twitter, LinkedIn, landing page copy, pitch decks, demo video scripts.
>
> ## Protocol
>
> 1. After every step (Task completion, major commit, architectural decision, milestone) — append an entry here.
> 2. All three tones every time. Don't skip one because "marketing isn't relevant yet" — write it anyway; future you will need it.
> 3. Past entries are immutable. Only append; never edit history. (If something turns out wrong later, add a new entry that says so.)
> 4. Each entry dated. Use absolute dates (YYYY-MM-DD), not "today" or "yesterday."
>
> ## Template (copy-paste at the bottom)
>
> ```markdown
> ## YYYY-MM-DD — [Step / Task name]
>
> ### 🔧 Engineering
> - What was done (files, commands, decisions)
> - Why (alternatives considered, trade-offs)
> - Gotchas (errors, fixes, surprises)
> - Commit / PR references
>
> ### 💬 Raw
> (2-4 sentences in honest founder voice — what really happened, how it felt, what almost went wrong, what was satisfying)
>
> ### 📣 Marketing
> - One-line headline
> - 2-3 talking points
> - Comparisons / analogies
> - Tagline candidates (if relevant)
> ```

---

## 2026-05-25 — Project genesis → Tauri pivot

### 🔧 Engineering

- **v1 audit:** existing Python FastAPI + Next.js codebase (~11K LOC, 16 docs in `docs/`, AI-codegen-platform frame). Audit determined ~70% of v1 was legacy under new product frame (BYO Claude Code, no AI calls from us).
- **BLUEPRINT.md authored** (`docs/BLUEPRINT.md`, ~250 lines, 12 sections): mission, founder pain, target user, wedge, core layers, stack, repo structure, phase plan, out-of-scope, open questions, references, living-document protocol.
- **Migration commit `339f6e1`:** `git mv` of 163 files into `old_repo/`. History preserved. `old_repo/docker-compose.yml` remains runnable as v1 fallback.
- **Bootstrap commit `d558213`:** pnpm monorepo skeleton — `apps/{web,api}` (Hello world stubs) + `packages/{viz,augmentor,skills,advisor,shared,platform-client}` + Biome + TypeScript strict + extended `.gitignore`.
- **Tauri pivot commit `7f64ff2`:** identified that browser sandboxing prohibits direct PTY/process spawn → cloud web app technically cannot control user's local Claude Code/Codex binaries. Pivoted to **Tauri 2.x**. Apps redefined: `apps/desktop` (Tauri Rust backend + React renderer), `apps/cloud` (later, Phase 1.4+, auth/sync/advisor only).
- **Final stack:** TypeScript (renderer) + Rust (Tauri backend); portable-pty, tokio, tokio::process for tmux; Supabase for cloud auth/DB (Phase 1.4+); Fly.io for cloud backend; Tauri auto-updater for distribution.
- **Trade-offs documented:** Tauri vs Electron — ~10MB binary vs ~150MB, 30-80MB memory vs 100-300MB, macOS WebKit vs bundled Chromium. Rust learning curve mitigated by AI-pair-coding (Jason's own Claude Code writes Rust, Jason reviews).
- **Competitive landscape mapped:** BridgeMind (same philosophy, Electron, per-project) — our wedge is Tauri lightweight + multi-startup. Warp, GitHub Codespaces, VS Code/Cursor, tmux/iTerm, Lovable/Bolt — all distinct categories or different axes.
- **Java platform decoupling:** billing, rate-limit, quota handled by separate Java/Spring platform (Jason's broader infra) via REST + OpenAPI. DalkkakAI consumes, doesn't own.
- **Task framework set up:** 11 tasks created with `TaskCreate`, Phase 1 sub-tasks (1.0 Tauri scaffold, 1.2 PTY pane, 1.3 multi-pane + tmux, 1.4 auth + sidebar, 1.5 dogfood) decomposed.

### 💬 Raw

이거 진짜 카오스였음. 16시간에 걸쳐서 frame이 5번 바뀜: "비기술자용 AI codegen 플랫폼" → "솔로 indie hacker portfolio operator" → "Visual cloud tmux" → "Claude Code augmentation platform" → "Tauri native desktop". 한 번에 정확한 frame 못 짚었음. 매번 본인이 짚어줘서 좁혀졌음 — "AI 호출 안 하면 Python 의미 없네" → "근데 cloud web으로 사용자 컴퓨터 못 제어하잖아" → 결국 Tauri.

가장 무서웠던 건 11K LOC를 `old_repo/`로 옮길 때. 자식 같은 코드를 freezing하는 거잖아. 근데 옮기고 보니까 *훨씬 자유로워짐*. 새 frame에서 70%는 어차피 legacy인데 끌고 가면 매일 mental tax. `git mv`라 history 다 살아있고, `cd old_repo && docker-compose up`도 그대로 됨. 안전망 있으니까 결정 빨라짐.

Tauri 결정도 그 frame에서 자연스러움: native 안 하면 12 데스크톱 못 ditch (browser는 PTY 못 띄움). Electron보다 Tauri는 메모리/사이즈 5배 좋음. Rust 배워야 하긴 하는데 본인 Claude Code가 짜줄 거니까 부담 X. Amazon 면접에도 plus.

핵심 깨달음 하나: **scratch-your-own-itch 단계는 시장 분석/TAM/persona 같은 거 다 secondary**. "Jason이 12 desktops를 1 app으로 ditch 1주일"이 진짜 MVP. 그것만 되면 다음 결정들이 다 명확해짐. 자꾸 "indie hacker market size 얼만데" 같은 거 신경 쓰니까 frame이 흔들렸음.

지금 솔직히 — Tauri scaffold (Task #12)만 끝나면 PTY pane (Task #8) 1주일 안에 가능할 듯. 그러면 12 데스크톱 중 *일부*는 즉시 ditch 시작 가능. Phase 1 전체 6-8주면 본인 daily app 됨.

### 📣 Marketing

> **"DalkkakAI — the lightweight native workspace OS for solo indie hackers running multiple startups."**

Talking points:

1. **"Built for solo founders, by a solo founder."** Scratch-your-own-itch — Jason runs 12 macOS desktops daily juggling Claude Code sessions, Cursor windows, terminals across multiple startups. DalkkakAI replaces that.
2. **"BYO AI — we don't take a token margin."** Users plug in their own Claude Code/Codex subscription. We charge a flat platform fee. Token costs stay between them and Anthropic. Transparent.
3. **"Tauri-powered. 1/5 the memory of Electron alternatives."** ~10MB binary, 30-80MB memory. Built to run *alongside* multiple Claude Code sessions, not compete with them for RAM.
4. **"Multi-startup first-class."** Unlike VS Code, Cursor, BridgeMind, or Warp — all of which optimize for one project — DalkkakAI's sidebar is built around N concurrent startups. Pieter Levels-style portfolio operators are the home audience.
5. **"Claude Code, augmented."** Tool calls, confirm dialogs, and file edits become a friendly UI — not raw terminal text. Your accumulated prompt skills auto-inject when a session opens.

Analogies for pitches:

- "VS Code is the workflow OS of code editing. **DalkkakAI is the workflow OS of running multiple startups.**"
- "Warp made single-session terminals modern. **DalkkakAI does the same for multi-session, multi-startup workflows.**"
- "Codespaces brought IDEs to the cloud. **DalkkakAI keeps them on your laptop, where they belong — and adds the dashboard you wished GitHub gave you.**"

Tagline candidates:

- *"Your AI agents, organized."*
- *"12 desktops → 1 workspace."*
- *"The native workspace OS for indie founders."*
- *"Run more startups. Open fewer windows."*

Key numbers (memorize for fast pitches):

- **10MB binary** (Tauri vs Electron's 150MB)
- **30-80MB memory** (Tauri vs Electron's 100-300MB)
- **1 codebase, 3 OSes** (macOS / Linux / Windows via Tauri)
- **0 token markup** (BYO subscription)

---

<!-- New entries below this line. Use the template at the top. -->

## 2026-05-26 — Phase 1.0 Tauri scaffold landed (Task #12)

### 🔧 Engineering

- Installed Rust 1.95.0 + Cargo 1.95.0 via rustup (`sh.rustup.rs`, profile=minimal, default-toolchain=stable, aarch64-apple-darwin).
- Removed `apps/web` and `apps/api` placeholders from initial v2 bootstrap (commit `a4d2295`).
- Scaffolded Tauri 2.x at `apps/desktop` via `pnpm create tauri-app --yes --template react-ts --manager pnpm --identifier ai.ddalkkak.desktop`. 37 files: React+Vite renderer, Cargo.toml + default `main.rs`/`lib.rs`, `tauri.conf.json`, full icon set (icns/ico/PNG variants), capabilities/default.json. Commit `e942483`.
- `pnpm install` at root — pnpm workspaces picked up `apps/desktop` automatically (8 workspace projects now, 75 new packages, 20.7s).
- Verified `pnpm tauri --version` → `tauri-cli 2.11.2`.
- Added Rust crates to `apps/desktop/src-tauri/Cargo.toml` via `cargo add`:
  - `portable-pty` — PTY backend (VS Code-quality, used by Warp/WezTerm)
  - `tokio` with features `rt-multi-thread, macros, process, io-util, sync` — async runtime + subprocess (for tmux)
  - `serde` with feature `derive` — JSON (de)serialization for Tauri commands
- Native window verification deferred to user (`cd apps/desktop && pnpm tauri dev` triggers macOS WebKit window — model can't see GUI).
- `tauri` 2.x already in Cargo.toml default; no version override needed.

### 💬 Raw

드디어 코드 단계 진입. 16+시간 문서/계획만 하다가 갑갑했는데, 막상 Rust install + Tauri scaffold는 5분이면 끝났음. Rust install이 가장 부담스러웠는데 home 디렉토리에 깔리고 reversible이라 결국 부담 적었음. `rustc 1.95.0` 깨끗하게 잡혔음.

Tauri scaffold가 인상적으로 깔끔함. boilerplate가 *진짜로* minimal — 37 file 중 절반은 icons. Cargo.toml, main.rs, lib.rs는 hello-world 수준. Tauri 2.x가 정리가 잘 되어있음.

이제 native window 한 번 띄워보고 (사용자가 확인) Task #8 (PTY pane) 진입. PTY pane이 우리 product의 *진짜 첫 기능*. portable-pty + xterm.js를 Tauri events로 연결하는 게 사실상 entire-product의 backbone.

`pnpm install` 20초 걸린 거 보고 잠깐 흠칫했는데 (Tauri Rust deps는 cargo build 시점에 따로 받으니 별개), 그 다음 cargo add 3개 instant. 다음 `pnpm tauri dev` 첫 실행이 cargo build를 트리거할 거고 — 그건 처음 1-2분 걸림 (Rust 컴파일). 그 후로는 incremental.

### 📣 Marketing

> **"DalkkakAI v2.1 — Tauri 2.x scaffold landed. Rust backend (portable-pty, tokio, serde) ready for PTY work. First native window: hours away."**

Talking points:

- **"Decision to scaffold: under 24 hours."** From "should we pivot to Tauri?" (May 25) to running scaffold on disk (May 26). Solo + AI-pair execution speed.
- **"Modern stack from line one."** Rust 1.95.0, Tauri 2.11.2, React 18 + Vite, TypeScript strict. No legacy baggage — `old_repo/` keeps history but the new tree is clean.
- **"Zero manual Tauri config."** `pnpm create tauri-app` scaffolded 37 files including full cross-platform icon set. Production-ready bundling on day zero.
- **"PTY-first stack."** portable-pty (same crate used by Warp and WezTerm) chosen over Node.js `node-pty` route — better cross-platform, better Rust integration.

Tagline: *"From pivot to scaffold in one day."*

Numbers worth quoting:

- Rust 1.95.0 / Tauri 2.11.2 (current as of May 2026)
- 37 files scaffolded
- 20.7s `pnpm install` for 75 packages
- Commits: a4d2295 (placeholder removal) + e942483 (scaffold)


## 2026-05-26 — Phase 1.2 Single PTY pane working (Task #8)

### 🔧 Engineering

- **`apps/desktop/src-tauri/src/pty.rs`** (~90 lines): `PtySession` struct holding `master`, `writer`, `child` (each in `Mutex` for cross-thread shared access). `spawn(window, cols, rows)` opens a PTY via `portable_pty::native_pty_system()`, spawns `$SHELL` (defaults to bash), and launches a background thread that reads stdout in 4KB chunks and emits `pty-output` events to the renderer.
- **`apps/desktop/src-tauri/src/lib.rs`**: 4 `#[tauri::command]` exports — `pty_spawn`, `pty_write(input)`, `pty_resize(cols, rows)`, `pty_kill`. State held in `PtyState(Mutex<Option<PtySession>>)`, registered via `app.manage()` in setup hook.
- **`apps/desktop/src/App.tsx`**: xterm.js `Terminal` + `FitAddon`. `useEffect` boots an async block: `listen('pty-output')` → `term.write`; `invoke('pty_spawn', { cols, rows })`; `term.onData` → `invoke('pty_write')`; window `resize` → `fit()` + `invoke('pty_resize')`. Cleanup: unlisten + `pty_kill` + `term.dispose`.
- **`apps/desktop/src/App.css`**: full-viewport (`100vw × 100vh`) terminal host, slate-900 background.
- **Renderer deps added**: `@xterm/xterm@6.0.0`, `@xterm/addon-fit@0.11.0`, `@tauri-apps/api`.
- **Verification**:
  - `cargo check`: passed cold in **40.89s** (first-time crate compilation).
  - `pnpm tauri dev`: native window opens with a working terminal.
  - `ls`, `echo`, and `claude` (Claude Code itself) confirmed running inside the pane.
- **Commit**: `3545057`.
- **Tauri 2.x patterns confirmed**: `Emitter` trait on `Window` for event emit, `State<'_, T>` for command-time state access, `Manager::manage` in `setup` hook.

### 💬 Raw

처음으로 *코드가 동작하는 순간*. 16시간 reframe 했던 product가 진짜 윈도우 띄우고 PTY에 입력 받고 출력하는 native app이 됨.

`portable-pty` 처음 써봤는데 API 깔끔함 — Warp/WezTerm이 왜 쓰는지 알겠음. `cargo check`가 첫 시도에 통과해서 솔직히 놀랐음 (Rust 거의 처음 짜는 거라 fail 예상). Tauri 2.x의 `generate_handler!` macro가 깔끔하고 `Emitter` trait도 직관적. Rust ownership에서 살짝 헷갈렸던 부분은 `Mutex<Box<dyn Trait + Send>>` — child + master + writer를 각각 따로 Mutex로 감싸서 thread safety + interior mutability 둘 다 챙김.

가장 큰 깨달음: **본인 Claude Code (`claude` 명령) 가 DalkkakAI 안에서 띄워짐**. Single pane이고 multi-startup 없지만, 개념 증명은 완료. 본인이 어차피 `pnpm tauri dev` 켜둔 채로 거기서 `claude` 띄우고 작업하면 — 12 데스크톱 중 *1 데스크톱*은 즉시 ditch 가능. 부분 dogfood 시작 가능 시점.

Dev mode 처음 cold build 1-2분 — 본인이 살짝 답답해함. 정상. Phase 1 끝나면 release build로 `.app` 만들어 instant 띄움. 지금은 hot reload 위해 dev session 켜둔 채 작업하면 됨.

### 📣 Marketing

> **"DalkkakAI v0.0.1 — first native PTY pane runs inside Tauri 2.x. Bash, Claude Code, anything that needs a TTY — works."**

Talking points:

1. **"From pivot to working PTY pane in <48 hours."** Decision to use Tauri (May 25) → working terminal in a native window (May 26). Solo + AI-pair execution speed.
2. **"`portable-pty` + `xterm.js` bridge in ~90 lines of Rust."** Production-grade terminal infrastructure with minimal code, leveraging the same crate Warp and WezTerm use at scale.
3. **"Same PTY engine as Warp and WezTerm."** Choosing infrastructure that's already battle-tested.
4. **"Single pane today, multi-pane tomorrow."** Phase 1.3 brings `react-mosaic` + tmux persistence.

Comparisons:

- "VS Code's xterm.js running inside Tauri instead of Electron." — same renderer-side terminal stack, 1/15 the binary size.
- "Like attaching a tmux window to a SwiftUI shell — except cross-platform and built in a day."

Tagline candidates:

- *"It runs. Type. Watch."*
- *"First TTY, then 12 of them."*
- *"Hello, bash. Hello, Claude Code."*

Numbers worth quoting:

- 40.89s cold `cargo check` (incremental rebuilds: 5-30s)
- ~90 lines `pty.rs`, ~50 lines `lib.rs` commands
- 4 Tauri commands: spawn / write / resize / kill
- Dependencies: `@xterm/xterm@6.0.0`, `portable-pty@0.9.0`, `tokio@1.52.3`, `tauri@2.x`


## 2026-05-26 — Phase 1.3 multi-pane working (Steps A-C, 4 iterations)

### 🔧 Engineering

- **Step A** (commit `b76c956`): per-pane PTY backend. `pty.rs` keyed by id, emits `{id, data}` event payload. `lib.rs` `PtyState(Mutex<HashMap<String, PtySession>>)`.
- **Step B** (`b76c956`): react-mosaic + TerminalPane component. Toolbar Split / Stack / Reset.
- **Step C — three iterations on top of the same root cause**:
  - **C.1** (`d175811`): tmux integration. `tmux new-session -A -D -s dalkkak-<id>` so the *server-side* shell would survive React remount.
  - **C.2** (`4ad76e7`): 4-layer hardening — `find_tmux()` absolute paths, `augmented_path()` prepends `/opt/homebrew/bin`, `bash -c` wrapper makes tmux failures visible, yellow `[pane closed]` on PTY EOF.
  - **C.3** (`00498b9`, **the actual fix**): xterm + PTY lifecycle moved OUT of React. New `terminalRegistry.ts` holds a module-level `Map<id, { term, fit, unlisten, spawned }>`. `TerminalPane` attaches `term.element` to its container (or moves it on remount via `appendChild`). `useEffect` cleanup *never* destroys; only `destroyTerminal()` from explicit Reset does.
- Acceptance verified: Split / Stack with a live `claude` session in the source pane → session survives. Cleanup only on explicit Reset.
- 3 `ISSUES.md` post-mortems generated along the way (env, `[exited]` + share, lifecycle).

### 💬 Raw

오늘 진짜 카오스였다. Step A+B는 한 번에 깔끔. **Step C에서 3번 iteration**. 매번 본인이 *"이거 이상한데"* 짚어서 fix path 찾았음.

가장 *나쁜 패턴*은 첫 Step C — 한 번에 4 layer 추가 (tmux + bash wrapper + PATH + EOF). **너무 많이 한 번에**. 본인 답답함 누적. 결국 *진짜 fix*는 *완전 다른 layer* (React lifecycle decouple). 4 layer fix들은 맞는 방향이긴 했지만 *진짜 문제 아니었음*. 사용자 시간 1-2시간 더 빼앗음. **사과해야 할 부분**.

배운 점: **incremental + verify each layer**. 한 commit, 한 변경, 한 verify. 못 한 거 아니라 *얕게 검증하며 갔으면 1시간 절약*.

근데 — *iterations 자체가 자산*. ISSUES.md에 3 entries 깊이 분석. Amazon SDE II에서 *failure analysis*로 그대로 사용 가능. 본인이 *왜 이 fix가 작동하는지* 처음부터 끝까지 짚은 거 — 좋은 founder/engineer 자세.

마지막 commit (`00498b9`)은 *VS Code Server 패턴* 정통 구현. 1-2년치 production engineer 경험 압축. 처음부터 그렇게 했어야 했지만 — 결국 거기 도달.

지금 multi-pane이 *실제 작동*. 12 데스크톱 ditch 향해 진짜 시작.

### 📣 Marketing

> **"DalkkakAI multi-pane works — split panes without killing running Claude sessions. Built on the VS Code Server terminal-hosting pattern."**

Talking points:

1. **"From broken to working in 4 iterations, all post-mortem'd."** Step C.1 (tmux) → C.2 (env hardening) → C.3 (lifecycle decouple). Each iteration solved a real problem; only the last solved *the* problem. All three documented as 6-section ISSUES.md post-mortems.
2. **"xterm + PTY ownership decoupled from React."** Same pattern as VS Code Server, Coder.com, GitHub Codespaces. Pane state survives layout reshuffles. React is just a viewport.
3. **"3 post-mortems in 1 day, bug-as-asset culture from day one."** Every fix triggers a 6-section entry: symptom / root cause / fix / prompt-quality blame / avoidability / lessons. Permanent rules extracted to CLAUDE.md.
4. **"Composed primitives: react-mosaic + tmux + portable-pty + our registry."** Best-of-breed, no reinvented wheels.

Tagline candidates:
- *"Your panes outlive the layout."*
- *"Split. Without losing your work."*
- *"VS Code Server pattern. BYO Claude Code."*

Numbers (memorize):
- 4 commits to land working multi-pane
- 3 ISSUES.md post-mortems
- 153 insertions / 51 deletions in the actual fix (`00498b9`)
- Avg ~30 min per fix iteration including its full post-mortem


## 2026-05-26 — Phase 1.3 fully complete: persistence + reattach (Task #13)

### 🔧 Engineering

- **App.tsx**: layout `MosaicNode` tree serialized to `localStorage` on every `setLayout`. Initial state loaded from `localStorage["dalkkak.layout.v1"]` with basic shape validation; falls back to a fresh single pane on miss/corrupt.
- **Auto-reattach is free via Step C's tmux integration**: `pty_spawn` already runs `tmux new-session -A -D -s dalkkak-<id>`. `-A` = attach if exists, create otherwise. On app restart, restored layout's ids re-spawn → tmux reattaches to surviving sessions. `claude`/`codex` processes continue uninterrupted because tmux server is a system-level background daemon (survives our app's lifecycle).
- **Zombie cleanup**: `pty_kill` (called only from `destroyTerminal()` on explicit Close/Reset) now also runs `tmux kill-session -t dalkkak-<id>` so closed panes don't leak.
- Acceptance verified by user: open 3-4 panes, run claude, close app, reopen → everything intact.
- Commit: `5c3c56e`. 60 lines TS + 10 lines Rust total.

### 💬 Raw

이거 진짜 *신기*했다. 사용자 첫 반응이 "신기하다". 70 lines 글루로 *daily-tool feeling persistence* 완성.

핵심은 *우리가 안 만든 거*. tmux server는 1987년부터 background daemon. 우리는 *localStorage에 tree만 저장 + spawn 시 -A flag*. **Engineering의 best part — 어려운 problem 직접 안 풀고, 이미 잘 푸는 도구(tmux)에 위임**. VS Code Server / Coder.com이 *매끈한* 비결도 동일 — primitives 좋은 거 선택 + thin glue.

오늘 합쳐서 *24+ commits, Phase 1.0 → 1.3 fully complete*. 본인의 12 desktops → 1 DalkkakAI 향한 길의 80%. 남은 건 *Phase 1.4 sidebar* — multi-startup 정체성의 마지막 piece. 그것만 끝나면 product vision 완성.

기술적 가장 큰 깨달음 — *복잡한 새 problem*인 줄 알고 시작한 게 *기존 primitives 조합*으로 풀림. Step C iteration 3번 (lifecycle decouple 발견까지) + Step D+E의 *tmux daemon 활용*. 두 번 다 "다시 발명하지 말고 위임"이 정답. 매번 본인이 *"공유되네"*, *"신기하다"* 같은 reactions로 path 짚어줌.

### 📣 Marketing

> **"DalkkakAI Phase 1.3 complete — close the app, reopen, your Claude conversations are right where you left them. 70 lines of glue on top of tmux + localStorage."**

Talking points:

1. **"Restart-safe by default."** Close DalkkakAI for a meeting → reopen → multi-pane layout restored, `claude --resume` not even needed because the session never died.
2. **"Engineering minimalism."** 60 lines TypeScript + 10 lines Rust = full persistence. No process-state serializer; we leverage tmux (1987) as a battle-tested background daemon. *Glue, not invent.*
3. **"Same pattern as VS Code Server / Coder.com / GitHub Codespaces."** Editor/terminal state owned by infrastructure (here: tmux server). UI is a viewport that re-attaches.
4. **"Persistence by composition."** localStorage holds the tree; tmux holds the processes; we hold the bridge. Each piece does one thing well.

Tagline candidates:
- *"Close. Reopen. Right where you left it."*
- *"Persistence by composition, not invention."*
- *"tmux + localStorage + 70 lines."*

Numbers:
- 70 lines glue total (60 TS + 10 Rust)
- 1 single localStorage key (`dalkkak.layout.v1`)
- 1 tmux flag (`-A`) does the reattach magic
- 2.82s warm `cargo check` for the Rust change
- Total Phase 1 commits today: ~20


## 2026-05-26 — Phase 1.4 Step 1 (sidebar) + post-dogfood race fix (Task #10 partial)

### 🔧 Engineering

**Phase 1.4 Step 1 — multi-startup sidebar** (commit `bf0bcc4`):
- `src/startups.ts` (new): `Startup` type (id / name / emoji / createdAt) + localStorage helpers (`loadStartups`, `loadActiveStartupId`, `layoutKeyFor`).
- `src/Sidebar.tsx` (new): 64px vertical sidebar with emoji+name buttons, active highlight (blue 2px border matching focus indicator), inline `+ New` form (Enter to submit, Esc to cancel).
- `src/App.tsx`: layout state keyed by `activeStartupId`. Switching → `loadLayoutFor(id)` → `setLayout`. Bootstrap auto-creates `🚀 default` startup on first launch and migrates legacy `dalkkak.layout.v1` key.
- CSS: dark-theme `.sidebar`, `.startup-item` (with `.active` border), `.add-startup`, `.new-startup` input.

**Dev port** (commit `a14027b`): 1420 → 1430 (1421 → 1431 HMR). Local conflict with another user service.

**Race fix — new-startup layout lost on restart** (commit `51cac0a`):
- *Symptom*: created new startup via `+ New`, split panes, closed app, reopened → new startup's panes gone. Default unaffected.
- *Root cause*: classic `useEffect` ordering race. When `activeStartupId` changed, Load and Save effects re-ran in the same flush. Save closed over the stale `layout` (still the previous startup's value, or briefly `null`) and either wrote the wrong layout or `removeItem`'d the key. Default startup escaped because its layout came from `migrateLegacyLayout` — a synchronous write before any effect ran.
- *Fix — 3 layers defense in depth*: (a) `createStartup` synchronously seeds `saveLayoutFor(s.id, freshLeaf)` BEFORE flipping `activeStartupId`; (b) Load effect's fresh-leaf path also syncs to storage immediately; (c) Save effect explicitly guards `layout === null` so transient null states are never persisted; (d) `saveLayoutFor` type signature refuses null — `removeLayoutFor` is the explicit delete API.
- `docs/ISSUES.md`: 6-section post-mortem. Scored "foreseeable but not common knowledge" — React `useEffect` + external persistence is a known antipattern; senior engineers catch on review, mid-level may not.
- `docs/BACKLOG.md`: deferred "migrate to Zustand/Jotai" — if a 3rd race of this class lands, time to drop render-driven persistence entirely.

### 💬 Raw

오늘 합계 *6번째 lifecycle/race fix*. 패턴 명확함: **React useEffect + external persistence = recurring footgun**. Phase 1.3에서 xterm 컴포넌트 lifecycle 한 번 빼냈고, Phase 1.4에서 layout persistence load+save race 또. 동일 family.

해결도 동일 — *render lifecycle에서 sync mutation으로 빼내기*. createStartup이 `setActiveStartupId` 전에 *동기적으로 storage seed*. Save effect가 *transient null* 안 쓰게. Defense in depth — 4 layers (createStartup sync seed, Load fresh-leaf sync seed, Save null guard, saveLayoutFor refuses null). 어느 한 layer만 fail해도 다른 게 막음.

진짜 가치는 *사용자의 dogfood reporting*. "추가한 거 껐다 키니까 다 날아가" 한 줄로 정확한 race scenario 짚힘. Step 1 ship → 즉시 검증 → fix → Step 2 deferred. *Lean cycle*.

BACKLOG에 *Zustand/Jotai migrate*가 들어간 게 의미. 3번째 같은 class race 나오면 *real store* 도입 — 그때까지는 *render-driven으로 버티되 매번 분석*. Cost-aware engineering.

오늘 *24+ commits*. 진짜 카오스인데 *각 commit이 일관된 작은 단위* + *각 fix가 post-mortem 동반*. *문제→fix→learning* 사이클 6번 돌리며 *코드+문서 동시 진화*. Founder-engineer practice의 좋은 sample.

### 📣 Marketing

> **"DalkkakAI Phase 1.4 sidebar + post-dogfood race fix. 6th useEffect-class issue this week, each with full 6-section post-mortem. Bug-as-asset culture in action."**

Talking points:

1. **"6 issues, 6 post-mortems, 6 lessons."** Every fix this week ships with a `docs/ISSUES.md` entry: symptom / root cause / fix / prompt-quality blame / avoidability / lessons. The pattern is now clear: `useEffect` + external persistence is the recurring footgun.
2. **"Defense in depth, on purpose."** Today's race fix isn't a single patch — synchronous seed in `createStartup`, sync write in load effect's fresh-leaf path, null guard in save effect, type signature refuses null. Each layer alone fixes it; together they make recurrence near-impossible.
3. **"Pattern recognition compounding."** Phase 1.3 had a lifecycle-decouple fix (xterm out of React). Phase 1.4 race is the same family. `BACKLOG.md` now carries "migrate to Zustand" as the trigger-on-3rd-race policy.
4. **"User reports → 1-paragraph race scenarios → 3-layer fixes."** This week is what dogfood-driven development actually looks like.

Tagline candidates:
- *"Every race learned twice."*
- *"6 post-mortems and counting."*
- *"Defense in depth, by accident."*

Numbers:
- 6 `ISSUES.md` entries today
- 4 layers in the latest race fix
- 24+ commits across Phase 1.0 → 1.4 in 24h
- 0 silently-applied workarounds (every fix has an analysis)


## 2026-05-26 — Production .app shipped: /Applications/DalkkakAI.app (Phase 1 fully done)

### 🔧 Engineering

- `pnpm tauri build --bundles app` (apps/desktop). Release profile, LLVM-optimized.
- Compile time: **1m 13s** (incremental cache from prior dev compiles).
- **Bundle: 8.7 MB total** (8.6 MB ARM64 binary + icons + Info.plist + frontend dist).
  - vs Electron baseline: ~150 MB → **~17× smaller**.
- Bundle ID `ai.ddalkkak.desktop`, version 0.1.0. Window 1400×900 (min 800×500).
- Installed to `/Applications/DalkkakAI.app`. `xattr -cr` to strip macOS quarantine (unsigned dev build — no Apple Developer cert yet).
- Cold launch: ~1s. Dock-pinnable, Spotlight-searchable.
- `tauri.conf.json` updated this session: productName `appsdesktop` → `DalkkakAI`, window title same.
- Frontend build downgrade: `react-mosaic-component@7.0.0-beta0` → `@6.1.1` stable (v7 has a breaking `MosaicNode` API change — `first/second` → `children[]` — that broke type-check at build time but didn't surface in dev). `createNode` prop removed (v7-only).

Phase 1 (1.0 → 1.4) fully shipped:
- 1.0 ✅ Tauri scaffold
- 1.2 ✅ Single PTY pane (portable-pty + xterm.js + Tauri events)
- 1.3 ✅ Multi-pane (react-mosaic) + tmux persistence + lifecycle decouple
- 1.4 ✅ Multi-startup sidebar + per-startup layout + ⌘1-9/⌘⇧[/⌘⇧] shortcuts + rename/delete context menu

### 💬 Raw

**미친 하루.** 25시간 전 `git fetch` 연결 안 돼서 시작. v1 Python 11K LOC, frame 5번 reframe (비기술자 → indie hacker → cloud tmux → augmentation → Tauri native). 지금 — **/Applications/DalkkakAI.app 8.7MB**. *진짜 native app*. Dock에서 클릭 → 즉시 떠. 본인 12 desktops → 1 app이 *진짜 손에 들어옴*.

8.7MB 본 순간 — **Tauri 선택이 맞았음을 처음 손에 체감**. Electron이면 150MB. 메모리도 비슷한 비율. 17× lighter. 매일 *동시에 5-10 Claude Code 띄울 때 눈으로 보이는 차이* (RAM 안 빼앗음).

진척: 31 commits, 8 docs (~2000 lines), 6 ISSUES.md post-mortems, 700 lines our code, ~수십만 lines borrowed. *우리는 200 lines glue*. 정직.

내일/오늘 저녁 → dock에 박고 **진짜 dogfood 시작**. 12 desktops 닫고 DalkkakAI만 1주일. 만족 → product. 불만족 → portfolio. 어느 쪽이든 *24h 마라톤이 자산*.

### 📣 Marketing

> **"DalkkakAI v0.1 shipped — 8.7 MB native macOS app. Multi-startup terminal multiplexer with tmux-backed Claude Code session persistence. Built solo in 24 hours."**

Talking points:

1. **"24-hour ship: idea → 8.7 MB native .app."** v1 Python codebase frozen, Tauri 2.x scaffolded, full Phase 1 (single PTY → multi-pane → tmux persistence → multi-startup sidebar + shortcuts + context menu) shipped to `/Applications/` next morning.
2. **"17× lighter than Electron alternatives."** ~8.7 MB vs ~150 MB. ~30-80 MB RAM vs ~100-300 MB. Runs *alongside* multiple Claude Code instances instead of competing for memory.
3. **"Solo + AI-pair workflow."** 31 commits, 6 six-section post-mortems, 8 docs files, ~700 lines of our code on top of Tauri / portable-pty / tmux / xterm.js / React / Vite / react-mosaic — composition over invention.
4. **"BYO Claude Code, no token markup."** Users plug in their own Claude Code/Codex/subscription. Platform fee model (Phase 4).
5. **"VS Code Server pattern: lifecycle decoupled from UI."** Pane state lives in tmux server (system daemon) + localStorage layout tree + module-level xterm registry. React Mosaic re-renders don't kill running processes.

Tagline candidates:
- *"8.7 MB. Multiple startups. Your Claude Code."*
- *"Shipped in 24 hours. Built to outlive 12 desktops."*
- *"The native workspace OS for solo founders running parallel startups."*

Numbers to memorize:
- 8.7 MB bundle (1.0 cold install)
- 1m 13s release compile (incremental)
- 31 commits in ~24h
- 6 ISSUES.md post-mortems
- ~700 lines of our code, rest borrowed
- Phase 1 (1.0 → 1.4) fully shipped

---

## 2026-05-30 — Korean/CJK input: tmux underscores fixed, WKWebView IME jamo leak diagnosed + deferred

### 🔧 Engineering
- Two verified root causes. (1) tmux ran non-UTF-8 — a Finder-launched GUI inherits no `LANG` and `pty.rs` only *forwarded* locale vars when already set → multibyte chars became `_`. Fix: DEFAULT `LANG`/`LC_CTYPE=en_US.UTF-8` (extends RULE #5b). (2) WKWebView fires NO DOM composition events for a textarea created before its IME is ready → xterm leaks raw jamo; pinned down by logging composition/keydown/inputType to `runtime.log`. First-pane case unresolved (workaround: split); deferred to BACKLOG.
- Logged two AI missteps honestly in ISSUES.md: a `userAgent` guess shipped before reading xterm's `CompositionHelper` (which has no isSafari check), and a terminal-recreation fix that fired on every remount → regressed working split panes → reverted.
- Commit: 7bd9ac1. Logs: ISSUES.md 6-section, troubleshooting.md, mdx.

### 💬 Raw
Classic dogfood-bites-back. "__" looked mysterious until the byte logic made it obvious (underscores are ASCII → tmux substitution). Then I got cocky and shipped two guesses for the jamo leak — one regressed a feature that already worked. Stopped, instrumented, and the data nailed it. Painful, but logging-to-runtime.log is the right reflex.

### 📣 Marketing
- "We debug our own terminal at the byte level — and write up every wrong turn."
- Korean input in a Tauri terminal is a genuinely hard cross-stack problem; mapped end to end.
- Honest failure analysis is half of good engineering.

## 2026-05-30 — Connective-layer vision confirmed + written into BLUEPRINT §5.5

### 🔧 Engineering
- Locked the thesis: the 6 core layers are bound by a shared DATA SPINE — a living portfolio graph of each startup's connection points (identity/structure/issues/flows/billing). External metrics PULL; internal change is PUSHed by agents in a platform-standard format, as a byproduct of work, under a hard constraint that recording never distorts the work. Standard locked+versioned, human-first, platform-owned, provenance per node. Mission refined to the start→build→manage→operate lifecycle. Written to BLUEPRINT.md §1 + new §5.5. Commit: 66452e9.

### 💬 Raw
The moment the product stopped being "a fancy terminal." Jason pushed back hard when I mis-framed it as a portfolio piece — it's a real venture, an OS for a solo founder running several startups. "Agents are sensors, you never hand-log again" is the soul of it.

### 📣 Marketing
- "DalkkakAI: the OS a solo founder uses to start, build, manage, and operate several startups at once."
- Every change across your whole portfolio, recorded automatically — never by hand.
- The terminal is the substrate; the product is the connective tissue.

## 2026-05-30 — Connective layer v0: designed (4/4 adversarially verified), built, working (16 real nodes)

### 🔧 Engineering
- Multi-agent design → 4 adversarial verifiers FAILED it 3/4 (capture on the render hot path; a path-grant primitive that didn't exist; a prompt→issue category error). Applied the prescribed fixes (capture git commits off-thread; build the path-grant primitive first; deterministic node_id + single ingest validator) → re-verified 4/4.
- Built layer by layer, each cargo-check/typecheck/build green: shared schema+validator; a single Rust `PathAllowlist` chokepoint (canonicalize+symlink-resolve, never `$HOME`, no Full Disk Access); a 20s tokio timer that shells `git -C <granted root>` off the render/PTY threads → confirmed `change` nodes; a folder-picker grant + a cross-startup `GraphPanel`. Terminal code untouched.
- Dogfood: granted 2 repos → 16 confirmed change nodes (incl. this session's own commits). Commit: 37c2fdc. Spec: docs/CONNECTIVE_LAYER.md.

### 💬 Raw
The opposite of the Korean saga — the adversarial pass caught three real defects BEFORE a line was written. Then it just built, layer by layer, every check green. Granting a repo and watching our own commits appear as nodes was the best moment of the day. The spine is alive.

### 📣 Marketing
- "From blueprint to a working slice of the connective layer in one session."
- Designed by a panel, attacked by adversaries, fixed, re-verified 4/4, then shipped — capturing 16 real changes on first run.
- The first living piece of "your whole portfolio, recorded automatically."

## 2026-05-30 — Terminal TCC fixed: DalkkakAI gets its own tmux server (-L dalkkak)

### 🔧 Engineering
- Symptom: a pane's `ls ~/Documents` returned Operation not permitted while the new git capture (same app) read the same repo fine. Cause (pgrep tmux): panes attached to the DEFAULT shared tmux server — a days-old daemon from another terminal, lacking Documents TCC — while capture ran git directly in the app's granted context.
- Fix: spawn/kill on a dedicated `tmux -L dalkkak` server → DalkkakAI shells run in a fresh app-started server (correct TCC) and are isolated from the user's other tmux sessions. Info.plist usage strings for the bundled-app prompt. **Verified working** (ls now succeeds). Commits: 9828c08, e9760c9.

### 💬 Raw
The tell was beautiful: capture could read the folder but the shell couldn't — same app, same path. One pgrep and it was obvious — we'd been squatting on whatever tmux server happened to be running, tangled with the user's other sessions. Our own server fixed the permission AND the entanglement. Should've been -L from day one.

### 📣 Marketing
- "DalkkakAI runs your sessions in its own isolated tmux server — no collisions with your other work."
- A multi-startup tool should never squat on your shared tmux.
- Permissions tuned for a normal user — no scary Full Disk Access.

## 2026-05-30 — Viz layer v1 (vocabulary draft + 5 renderers + Activity)

### 🔧 Engineering
- Built the rendering layer over the connective layer. A 4-agent workflow synthesised a 10-kind `viz_kind` vocabulary (viz-core's 24 kinds + three lensed proposals: minimalist / coverage / persona-first) → `packages/shared/src/viz.ts` (typed per-kind schemas + input→kind map) and `docs/VIZ_VOCABULARY.md`. Five Framer-Motion renderers (concept/plan/recap/question/mermaid), pure CSS/SVG — no canvas, WebKit-safe; animation used to clarify (sequential reveal, live "now" pulse), not decorate. `ActivityView` renders REAL captured commits through `recap` (`nodeToRecap.ts`) — strictly factual: real subject/files/line-counts, no invented next_step and no added/edited/deleted claim a `--stat` can't prove. Typed en/ko i18n with `useT()` (English default, persisted). Mermaid token-themed + wheel/drag zoom/pan. Commit `97a3654`; typecheck + build green. Vocabulary is a DRAFT, cards on sample data, Activity on real data — the augmentor→LLM-selector→per-session live path is next.

### 💬 Raw
- The honest arc: I kept over-explaining and Jason kept saying "just show me." Every "is the roadmap too much?" / "is this prettier?" got answered fastest by building it and letting him look — not by a paragraph. A couple of dead ends (raw text → icons → still text-heavy → finally real renderers) before it clicked, and he caught the real tension himself: "do we keep hand-coding standards forever?" — which is exactly why the vocabulary + escape hatches exist. The guardrail that never moved: density is fine, distortion is forbidden, so the real-commit cards show only what git actually proves. Also — he switched us to English mid-session to practice. That's its own kind of nerve.

### 📣 Marketing
- "DalkkakAI doesn't dump raw logs on you — it renders what your AI is doing as glanceable cards: the plan, the recap, the decision, the concept explained."
- "Your real commits, auto-rendered as readable cards, grouped per startup."
- "Switch English ⇄ Korean instantly — built for a non-engineer founder, not a terminal jockey."

## 2026-05-30 — Per-session status v1 + the TUI-scraping dead end (+ delete discoverability)

### 🔧 Engineering
- Routed the augmentor event stream (already running per pane) into a live per-session status strip (`sessionStatus.ts` external store + `SessionStatusBar.tsx`). Dogfooded across THREE real Claude panes → only one lit up, and that one was a stale misparse ("Yourhomedirectory" from the prose "Your home directory ("). Root cause (verified by screenshot): Claude Code's TUI repaints its spinner in place ("Worked for 7s") via cursor moves, so a `\n`-line parser never receives the status as a line — detection is luck, not signal. Broadening patterns (`<Word> for <N>s`, `esc to interrupt`) did NOT help; the lines never arrive. Conclusion: TUI scraping is a dead end. Reliable path = Claude Code hooks (structured events tagged with an injected `DALKKAK_PANE_ID`), the same approach `viz-agents` took (`install_hooks.py`). Also: startup-delete already existed but was hidden behind right-click → added a visible `⋯` options button per sidebar startup. Commit `04b995e`.

### 💬 Raw
- Frustrating but clarifying. I spent the build on Layer 1 and it "worked" on exactly one pane — and even that was wrong. The screenshot made it obvious: we were reading a whiteboard by holding a tape recorder up to it. Knowing it's a dead end (and why) is worth more than a flaky strip that lies. Jason also called out that the logs were thinner than the actual work — fair, and honest: the history is solid back to March, but today's most-recent hour wasn't recorded. This entry closes that gap. No padding — just what really happened.

### 📣 Marketing
- "See every parallel session at a glance — what each AI is doing, across all your startups." (the goal; the reliable version reads Claude's own events, not the screen)
- "Delete a startup in one click — no hidden right-click menus."
- "We ship the honest limitation, not the flaky feature."

## 2026-05-30 — Per-session status, the reliable version: Claude Code hooks (ADR-001) + the logging loop's first save

### 🔧 Engineering
- Replaced TUI scraping with Claude Code **hooks**. Each pane is tagged via `DALKKAK_PANE_ID` (tmux `new-session -e`); a guarded hook appends `{pane,event,tool}` to a data-dir file; `hooks.rs` tails it → emits `session-hook` → `sessionStatus` (hook-driven; `PreToolUse`→working, `Stop`→done, `Notification`→needs-you). Hook installed user-side in `~/.claude/settings.json` (backed up, DalkkakAI-scoped via the env guard, reversible). Before editing the config I verified via the claude-code-guide agent that hooks **combine** across user+project scopes (no shadowing) — the first agent answer was wrong, so I re-asked. The build then crashed at launch (SIGABRT): `hooks::spawn_watcher` used `tokio::spawn` inside the Tauri `setup` closure (no entered runtime) → fixed to `tauri::async_runtime::spawn`. Diagnosed straight from `runtime.log` (died in setup) + the macOS crash report. Commit `c5bc1b1`. End-to-end status pending dogfood.

### 💬 Raw
- Two wins in one. First: stopped band-aiding the TUI scraper and did the real thing — and double-checked the merge-behavior fact before editing Jason's actual Claude config, with a backup. Second, and better: the build → install → logs → fix loop earned its keep on its very first crash. Jason said five words ("DalkkakAI quit unexpectedly 이러는데") and the logs handed me a one-line fix. Then he asked, unprompted, whether I'd recorded it as a good case — he's right, it is.

### 📣 Marketing
- "DalkkakAI reads its own logs — when something breaks, the fix comes from evidence, not guesswork."
- "Reliable per-session status, powered by Claude Code's own events — not by scraping the screen."
- "Touch your config? Only with a backup, scoped to DalkkakAI, and fully reversible."


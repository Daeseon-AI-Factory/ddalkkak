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

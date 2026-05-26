# DalkkakAI — Roadmap

> 전체 청사진 + 남은 단계의 *상세 sub-task / dependencies / 시간 추정*.
> Living document — 매 milestone 후 update.
> Last updated: 2026-05-26 (Phase 1 fully shipped, /Applications/DalkkakAI.app 10 MB).

---

## Snapshot

```
[✅ DONE — 오늘 26시간 마라톤]
Phase 0     Foundation         Tauri scaffold + pnpm monorepo + docs framework
Phase 1.0   Tauri scaffold     apps/desktop with React+Vite renderer + Rust backend
Phase 1.2   Single PTY pane    portable-pty + xterm.js + Tauri events
Phase 1.3   Multi-pane         react-mosaic + tmux persistence + lifecycle decouple
Phase 1.4   Multi-startup      Sidebar + per-startup layout + ⌘1-9 + context menu
+           UI polish          Toolbar enhancement + pane header tag + onboarding
+           Logging            Claude hooks (.claude/settings.json) + Rust tracing
+           Production         /Applications/DalkkakAI.app 10 MB, signed quarantine off

[⏳ NEXT]
Phase 1.5   Dogfood week           1 week        ← 즉시
Phase 2     Augmentation           2-3 months
Phase 3     Multi-startup ops      2-3 months
Phase 4     Beta + marketplace     3-6 months
Phase 5+    Long-term              vapor / BACKLOG
```

Total to MVP-with-paying-users: **~8-12 months** at solo + AI-pair pace.

---

## Phase 1.5 — Dogfood week (즉시, 1주)

**Goal**: Jason이 12 desktops 닫고 DalkkakAI만 1주일 사용.
**Success criterion**: 7일 후 *돌아가고 싶지 않음* OR 명확한 *gap list*.

### Tasks
| # | Task | Where |
|---|---|---|
| 11.1 | `/Applications/DalkkakAI.app` 띄움. 12 desktops 중 1-3개부터 옮김 | manual |
| 11.2 | 매일 답답한 부분 1줄 → `docs/BACKLOG.md` 또는 `docs/ISSUES.md` | docs |
| 11.3 | 매일 진짜 가치 felt 1줄 → `docs/MILESTONES.md` 💬 Raw | docs |
| 11.4 | 7일 후: 종합 entry + go/no-go 결정 | docs |

### Branch — 검증 결과에 따라
- ✅ **돌아가고 싶지 않음** → Phase 2 진입 (product 가능)
- 🟡 **불만족 + gap list** → Phase 2 우선순위 재조정 또는 minimal fix
- ❌ **그저 그럼 / 흥미 없음** → Portfolio로 정리. Amazon SDE II 우선

### Critical risks
- macOS Gatekeeper / 권한 issue → `xattr -cr` 이미 처리, 단 재발 시 fix
- 2nd-pane 15s shell-init slowness — BACKLOG Task #14 trigger 가능

---

## Phase 2 — Augmentation (Month 2-4, ~2-3개월)

**Goal**: Claude Code의 *raw 출력*을 *human-friendly UI*로 변환. 진짜 wedge.

### Phase 2.1 — Claude Code output parser (~2주)
- 2.1.1 `packages/augmentor/` 활성화
- 2.1.2 Stream chunk parser — Claude Code의 "Tool: edit X", "Allow Y/N?" 등 패턴 인식
- 2.1.3 Test fixtures — 다양한 Claude Code 출력 stream 캡처
- 2.1.4 Pane lateral panel — focused pane이 Claude 운영 중이면 sidebar에 *parsed detail*

### Phase 2.2 — Friendly UI overlay (~2주)
- 2.2.1 Tool call detected → side panel (file diff viewer / bash 결과 분리)
- 2.2.2 "Allow / Deny?" prompt → 즉시 click 버튼 (xterm 입력 우회)
- 2.2.3 Stream 도중 progress indicator — *working / idle / blocked / completed*
- 2.2.4 Pane header에 *AI activity dot* (color로 상태 표시)

### Phase 2.3 — Skills auto-injection (~1-2주)
- 2.3.1 `packages/skills/` 활성화 — md + yaml manifest 포맷
- 2.3.2 Jason의 first 5-10 skill packs (현재 본인 `.claude/skills/` 또는 비슷 → packages/skills/로 import)
- 2.3.3 Sidebar에 *active skills toggle* (per startup 별)
- 2.3.4 Pane spawn 시 → skill의 system prompt / context 자동 prefix

### Phase 2.4 — Editor in pane (~2주, 옵션)
- 2.4.1 Pane type 시스템 — Terminal / Editor / Browser / Diagram
- 2.4.2 Monaco editor pane — file 열고 보기 + 작은 편집 (full IDE X)
- 2.4.3 File diff viewer pane — Claude Code의 file edit 시 자동 표시

### Phase 2 end-of-phase decision
- ✅ Augmentation이 *진짜 다름* → Phase 3 진입
- 🟡 일부만 가치 → 그 부분만 keep + Phase 3로
- ❌ Augmentation 효과 약함 → Phase 3 skip, *terminal-multiplexer 단독*으로 Phase 4 직진

---

## Phase 3 — Multi-startup operator layer (Month 4-7, ~2-3개월)

**Goal**: 단순 multi-pane terminal → *진짜 운영 도구*. Pieter Levels-style portfolio operator.

### Phase 3.1 — Cross-startup uptime monitoring (~1주)
- 3.1.1 Startup metadata에 *deployed URL* 필드 추가
- 3.1.2 Background ping (Rust tokio) — 5분마다 startup URL
- 3.1.3 Sidebar에 status dot (●green / ◐yellow / ✕red)
- 3.1.4 Click → uptime history / status detail panel

### Phase 3.2 — Architecture viz auto-generation (~2-3주)
- 3.2.1 `packages/viz/` 활성화 — Mermaid + React Flow wrappers
- 3.2.2 Code → architecture diagram (per startup) — file tree / API flow / db schema
- 3.2.3 Diagram pane type — mosaic layout에 추가

### Phase 3.3 — Advisor daily summary (~1-2주)
- 3.3.1 `packages/advisor/` 활성화 — Anthropic TS SDK (사용자 본인 Claude key BYO)
- 3.3.2 Daily 9am job (Tauri scheduled command) — 전날 모든 startup *변화* 요약
  - Git commits per startup repo
  - Uptime events
  - Pane activity heatmap
- 3.3.3 Sidebar에 "Today's brief" 알림 → 사용자 morning entry point

### Phase 3.4 — Revenue / user metric integration (~2-3주, 옵션)
- 3.4.1 Per-startup external service connectors — Stripe, PostHog, Plausible
- 3.4.2 Cross-startup dashboard view — MRR / DAU / 등 한 화면
- 3.4.3 Advisor가 metric 변화도 포함

### Phase 3 end-of-phase decision
- ✅ Operator layer가 *daily-open 이유*가 됨 → Phase 4 (release) 진입
- 🟡 일부 가치 → 핵심만 keep
- ❌ Cross-startup gimmick → Phase 4로 직진, operator layer는 backlog

---

## Phase 4 — Beta release + marketplace (Month 7-12, ~3-6개월)

**Goal**: 50 paying users, $500+/mo MRR, public release.

### Phase 4.1 — Production distribution (~1주)
- 4.1.1 Apple Developer Program 가입 ($99/year)
- 4.1.2 Developer ID Application cert 발급
- 4.1.3 Tauri config에 signing identity 추가
- 4.1.4 Notarization 셋업 (`xcrun notarytool`) + stapling
- 4.1.5 Tauri auto-updater (Cloudflare R2 CDN)
- 4.1.6 `pnpm tauri build` → signed + notarized + dmg + updater 메타데이터

### Phase 4.2 — Cloud backend (~2-3주, Phase 1.1 + 1.4 deferred 작업 흡수)
- 4.2.1 Supabase project 생성 (auth + Postgres)
- 4.2.2 `apps/cloud` (Hono) deploy on Fly.io
- 4.2.3 Java platform 연동 (REST + OpenAPI generated TS client) — billing / rate-limit
- 4.2.4 Multi-device sync (settings, skills enable list, layout backup — optional)

### Phase 4.3 — Onboarding + landing (~1-2주)
- 4.3.1 Landing page (`dalkkak.ai`)
- 4.3.2 Sign-up flow (Supabase auth)
- 4.3.3 First-launch walkthrough — 지금 onboarding overlay보다 깊게
- 4.3.4 Pricing page (4 tier: Free / Starter / Growth / Scale)
- 4.3.5 Documentation site (이미 docs/ 있음 — 외부 공개)

### Phase 4.4 — Skills marketplace MVP (~2-3주)
- 4.4.1 Skill pack 정의 — md + yaml manifest + 카테고리
- 4.4.2 Jason의 first published skill packs (5-10개) — 본인 Claude Code 노하우
- 4.4.3 Sidebar "Discover skills" tab — browse + install / uninstall
- 4.4.4 Skill version + update flow

### Phase 4.5 — Public release (~1주)
- 4.5.1 Beta announcement (Twitter, indie hacker Discord, ProductHunt)
- 4.5.2 First 50 users acquisition
- 4.5.3 Stripe webhook integration (Java platform 경유)
- 4.5.4 First paying customer

### Phase 4 success metrics
- 50 paying users
- $500+/mo MRR
- Churn < 10%/월
- 평균 *사용 시간 / week* > 5h

---

## Phase 5+ — Long-term (vapor, BACKLOG)

- Skills marketplace 3rd-party sellers (revenue share 70/30)
- Mobile / tablet companion view (read-only?)
- Multi-tenant cloud workspace (Firecracker / gVisor isolation)
- Windows + Linux builds (Tauri cross-platform 활용)
- Cursor / Monaco editor in-pane 깊게
- AI-powered workspace organization (auto-cluster panes, predict next task)
- Team workspaces (multi-user shared startups)

---

## Deferred (BACKLOG.md 참조)

Active backlog items (1-2 hours each, dogfood가 trigger):
- **#14** Pre-warm PTY shells — second-pane delay (3-4h)
- **#16** Per-startup color accent (30m)
- Pane navigation shortcuts ⌘⌥arrows (30m)
- Pane number badges (20m)
- `pnpm typecheck` script (1m)
- Fast-shell toggle (1h)

Distribution / infra deferred (Phase 4 부속):
- macOS code signing → Phase 4.1
- Tauri auto-updater CDN → Phase 4.1
- Mobile / multi-tenant → Phase 5+

---

## Dependencies graph

```
Phase 1 ✅
   │
   ├──► Phase 1.5 dogfood (1 week) ─────────────► go/no-go decision
   │                                                    │
   │                                                    ▼
   │     Phase 2.1 parser ──┐
   │                        ├──► Phase 2.3 skills (parallel)
   │     Phase 2.2 UI ──────┘
   │                        │
   │                        ▼ (Phase 2 done)
   │                Phase 3.1 uptime ──┐
   │                                   ├──► Phase 3 done
   │                Phase 3.2 viz ─────┤
   │                Phase 3.3 advisor ─┘
   │                                   │
   │                                   ▼
   │                          ┌────────┴────────┐
   │                          ▼                 ▼
   │              Phase 4.1 distribution    Phase 4.2 cloud
   │                          ▲                 ▲
   │                          └────────┬────────┘
   │                                   ▼
   │                          Phase 4.3 onboarding
   │                                   ▼
   │                          Phase 4.4 marketplace
   │                                   ▼
   │                          Phase 4.5 public release
```

Phase 4.1 + 4.2는 parallel. 그 후 4.3 → 4.4 → 4.5 sequential.

---

## Timeline (solo + AI-pair, full-time 가정)

| 시점 | 마일스톤 |
|---|---|
| **지금** (T+0) | Phase 1 done, .app shipped |
| **T + 1 week** | Phase 1.5 dogfood done → go/no-go |
| **T + 3 months** | Phase 2 done (augmentation working) |
| **T + 6 months** | Phase 3 done (operator layer) |
| **T + 9-12 months** | Phase 4 done (50 paying users) |

Part-time이면 2배 (~24개월).

---

## 의사결정 포인트

매 Phase 끝나면 *go/no-go*:

1. **Phase 1.5 dogfood 후** — *dogfood 가치 검증*. felt 없으면 portfolio 정리.
2. **Phase 2.1 parser 후** — *augmentation 진짜 wedge인지 확인*. 약하면 pivot 또는 Phase 3 skip.
3. **Phase 3.3 advisor 후** — *cross-startup 운영 가치 felt*. 없으면 *terminal multiplexer*만으로 Phase 4 직진.
4. **Phase 4.5 release 후** — *50 user / $500 MRR* 도달 또는 실패. 실패면 *learnings + 다음 product*.

각 분기에 BLUEPRINT.md + ROADMAP.md 모두 update.

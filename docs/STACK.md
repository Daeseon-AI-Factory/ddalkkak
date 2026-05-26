# DalkkakAI — Stack & Credits

> 정직한 분리: 우리가 *빌려쓰는 것* vs 우리가 *만든 것*.
> 모던 엔지니어링의 진짜 모습 — **~600 lines 우리, ~수십만 lines 거인의 어깨**.

---

## 우리가 빌려쓰는 것 (그대로 사용, 발명 X)

### Runtime / 언어

| 도구 | 역할 | 출시 | Source |
|---|---|---|---|
| **Tauri 2.x** | Desktop app runtime (Electron 대안, ~1/15 binary size) | 2020 | Rust |
| **Rust 1.95** | Tauri backend 언어 | 2010 | Mozilla → Rust Foundation |
| **Node.js 22** | JS runtime | 2009 | OpenJS Foundation |
| **TypeScript 5** | Frontend 언어 | 2012 | Microsoft |
| **macOS WebKit** | Tauri webview engine (no bundled Chromium) | 2003 | Apple |
| **pnpm 9** | Package manager + workspaces | 2017 | open source |

### PTY / Terminal (핵심 surface)

| 도구 | 역할 | 출시 | 누가 같이 쓰나 |
|---|---|---|---|
| **portable-pty 0.9** (Rust crate) | Cross-platform PTY 구현 | 2018 | **Warp Terminal**, **WezTerm**도 동일 |
| **tmux 3.6** (시스템 daemon) | Background session daemon | 2007 (screen 1987 후계자) | 거의 모든 power-user 터미널 |
| **xterm.js 6** (TS) | Terminal UI emulator (canvas + VT 처리) | 2014 | **VS Code 내장 터미널**, code-server, ttyd, Jupyter |
| **@xterm/addon-fit** | viewport fit 계산 | — | 같은 팀 |
| **tokio 1.52** (Rust) | Async runtime + subprocess | 2017 | Rust 생태계 표준 |

### UI

| 도구 | 역할 | 출시 |
|---|---|---|
| **React 18** | UI framework | 2013 (Facebook) |
| **Vite 5** | Frontend bundler + dev server | 2020 |
| **react-mosaic-component 7** | Drag-resize-able layout tree | 2017 |

### Tooling

| 도구 | 역할 |
|---|---|
| **Biome 1.9** | JS/TS linter + formatter (ESLint+Prettier 대안) |
| **rustfmt + clippy** | Rust formatter + linter |
| **cargo** | Rust build system |
| **serde** | Rust serialization |

### Persistence

| 도구 | 역할 |
|---|---|
| **localStorage** (browser native) | Layout + startups + active id |
| **tmux server** | Process state (Claude/codex sessions across app restarts) |
| (Phase 1.4+) **Supabase** | Cloud auth + DB |

### 우리가 *대체*하려는 대상

- **macOS Mission Control / Spaces** — 12개 desktops 띄우는 사용자의 현재 워크플로
- **iTerm2 / Terminal.app / Warp** — 단일 terminal app
- **Cmd+Tab + Mission Control** — 컨텍스트 switching

---

## 우리가 만든 것

### Code (~600 lines, 8 files)

| 파일 | 역할 | ~Lines |
|---|---|---|
| `src-tauri/src/pty.rs` | portable-pty + tmux + bash wrapper + env hygiene | 120 |
| `src-tauri/src/lib.rs` | Tauri commands (spawn / write / resize / kill) | 80 |
| `src/terminalRegistry.ts` | xterm + listener + PTY lifecycle outside React (VS Code Server pattern) | 80 |
| `src/TerminalPane.tsx` | xterm DOM attach/move + focus + ResizeObserver | 70 |
| `src/App.tsx` | Layout + Mosaic + Sidebar + shortcuts + persistence | 270 |
| `src/Sidebar.tsx` | Multi-startup UI | 60 |
| `src/startups.ts` | Startup model + localStorage helpers | 50 |
| `src/App.css` | Dark theme styles | 140 |
| **Total** | | **~870** |

### Docs (~2,000 lines, 8 files)

- `BLUEPRINT.md` — canonical vision + architecture (250 lines)
- `MIGRATION_PLAN.md` — v1 (Python) → v2 (Tauri) transition record
- `MILESTONES.md` — 3-tone log (Engineering / Raw / Marketing per entry)
- `ISSUES.md` — 6-section post-mortems (6 entries)
- `BACKLOG.md` — deferred items + protocol
- `SHORTCUTS.md` — keyboard reference (50-year industry pattern)
- `STACK.md` — this file
- `CLAUDE.md` — agent rules (7 numbered rules + #5b/c/d extensions)

---

## 가치는 어디에 있나

### 조합 (composition)

DalkkakAI의 unique 조합:

1. **Tauri** (Electron 대안, 1/5 메모리) **+ xterm.js** (terminal 표준) **+ portable-pty** (Rust PTY) **+ tmux** (39년 검증 daemon)
2. **react-mosaic** (layout tree) **+ module-level registry** (lifecycle decouple — VS Code Server 패턴)
3. **localStorage** (zero-infra) **+ tmux server 영속성** (background daemon) = persistence by composition
4. **Per-startup layout** **+ tmux session naming** (`dalkkak-<pane-id>`) = multi-startup first-class

### 차별화 (vs 빌려쓰는 도구들)

| 빌려온 도구 | 한계 | 우리가 추가 |
|---|---|---|
| tmux 단독 | TUI only, CLI 학습곡선 | Visual GUI + 클릭 split + 마우스 focus |
| Warp / iTerm | Single-project, multi-startup 개념 없음 | **Multi-startup sidebar first-class** |
| VS Code / Cursor | Editor-centric, terminal 부수적 | **Terminal-first**, BYO Claude Code |
| BridgeMind | Electron 무거움, per-project | **Tauri 1/5 메모리 + multi-startup** |
| 모든 cloud IDE | Cloud-bound, latency | **Native + tmux 영속성** |

### Post-mortem 자산 (Bug-as-asset)

6개 `ISSUES.md` post-mortem (각 6 sections — symptom/root cause/fix/prompt-blame/avoidability/lessons). 같은 class bug 두 번 안 만들기 위한 영구 자산.

---

## 비유

**미슐랭 셰프**가 *토마토, 마늘, 올리브유, 파스타* 다 시장에서 사옴. 본인이 키운 게 *아무것도 없음*. 단 *조합 + 비율 + 불 조절 + timing*이 셰프의 가치. 같은 재료로 50가지 다른 요리.

DalkkakAI도 같음. **우리가 발명한 것은 거의 없음**. *어떤 primitives를, 어떻게 조합하고, 어떤 lifecycle pattern으로 묶을지*가 우리 가치. ~600 lines 글루로 수십만 lines를 working product로 묶음.

### 이게 약점이냐?

전혀. **이게 모던 엔지니어링의 정답**.

- VS Code도 99% 빌려쓴 거 (Electron + Monaco + TypeScript compiler + Git CLI + ...). MS가 만든 건 *조합 + UX*.
- Cursor도 99% 빌려쓴 거 (VS Code fork + Claude/GPT API + ...). 차별화는 *AI 통합 패턴*.
- 모든 production app이 그렇다. *발명 = 사기*. *조합 = 기술*.

---

## License 의무

(추후 release 시점에 정리)

- 대부분 MIT / Apache 2.0 — 자유롭게 사용 가능
- tmux는 BSD — 동일
- 모든 의존성의 LICENSE 파일을 `licenses/` 디렉토리에 번들 예정 (Phase 4 distribution 단계)

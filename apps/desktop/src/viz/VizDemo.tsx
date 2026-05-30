//! Renderer showcase — sample payloads rendered with the real kind renderers, so we
//! can eyeball visual quality before wiring the BYO LLM that will produce live data.
//! Kind switcher across the llm_work trio (plan/recap/question) + concept. Samples are
//! language-driven (English default).

import { useState } from "react";
import type { ConceptData, MermaidData, PlanData, QuestionData, RecapData } from "@ddalkkak/shared";
import { useT } from "../i18n";
import type { Lang, StringKey } from "../i18n/strings";
import { ConceptCard } from "./ConceptCard";
import { MermaidCard } from "./MermaidCard";
import { PlanCard } from "./PlanCard";
import { QuestionCard } from "./QuestionCard";
import { RecapCard } from "./RecapCard";
import { c } from "./tokens";

type Kind = "concept" | "plan" | "recap" | "question" | "mermaid";
const KINDS: { kind: Kind; tkey: StringKey }[] = [
  { kind: "plan", tkey: "demo.kindPlan" },
  { kind: "recap", tkey: "demo.kindRecap" },
  { kind: "question", tkey: "demo.kindQuestion" },
  { kind: "mermaid", tkey: "demo.kindFlow" },
  { kind: "concept", tkey: "demo.kindConcept" },
];

const CONCEPTS: Record<Lang, ConceptData[]> = {
  en: [
    {
      concept: "Caching",
      tagline: "Keep frequent answers close so you don't redo the work",
      analogy: { name: "a barista memorizing your usual order", icon: "☕" },
      comparison: {
        without: { icon: "🐌", label: "No cache", steps: ["Hit the database every time", "Read from disk", "Send the response"], metric: "800ms" },
        with: { icon: "🐰", label: "With cache", steps: ["Check memory first", "Return instantly"], metric: "5ms" },
      },
      tradeoffs: { pros: ["~100× faster", "Less database load"], cons: ["Can show stale data", "Uses more memory"] },
      real_world: "Why a page loads instantly the second time you open it",
    },
    {
      concept: "JWT (JSON Web Token)",
      tagline: "A tamper-proof wristband that proves who you are",
      analogy: { name: "a festival wristband the gate checks without calling HQ", icon: "🎫" },
      comparison: {
        without: { icon: "📞", label: "Session lookup", steps: ["Send a session id", "Server asks the DB 'who is this?'", "DB answers"], metric: "DB hit / request" },
        with: { icon: "🎫", label: "JWT", steps: ["Send a signed token", "Server verifies the signature locally"], metric: "no DB hit" },
      },
      tradeoffs: { pros: ["No DB lookup per request", "Works across servers"], cons: ["Hard to revoke before expiry", "Bigger than a session id"] },
      real_world: "Staying logged in across an app's many backend servers",
    },
    {
      concept: "Webhook",
      tagline: "Don't call us — we'll call you, the moment something happens",
      analogy: { name: "a doorbell instead of checking the door every minute", icon: "🔔" },
      comparison: {
        without: { icon: "🔁", label: "Polling", steps: ["Ask 'any news?' every few seconds", "Usually the answer is no", "Wasted calls"], metric: "1000s of empty checks" },
        with: { icon: "🔔", label: "Webhook", steps: ["Register a URL once", "They POST you the instant it happens"], metric: "0 wasted checks" },
      },
      tradeoffs: { pros: ["Instant", "No wasted requests"], cons: ["Must expose a public endpoint", "Must handle retries / duplicates"] },
      real_world: "How Stripe tells your app 'payment succeeded' the instant it does",
    },
  ],
  ko: [
    {
      concept: "캐싱 (Caching)",
      tagline: "자주 쓰는 답은 가까이 둬서, 다시 만들지 않는다",
      analogy: { name: "바리스타가 단골 주문을 외워두는 것", icon: "☕" },
      comparison: {
        without: { icon: "🐌", label: "캐시 없음", steps: ["매번 DB까지 감", "디스크에서 읽기", "응답 보냄"], metric: "800ms" },
        with: { icon: "🐰", label: "캐시 사용", steps: ["메모리 먼저 확인", "바로 응답"], metric: "5ms" },
      },
      tradeoffs: { pros: ["약 100배 빠름", "DB 부담 줄어듦"], cons: ["오래된 데이터가 보일 수 있음", "메모리를 더 씀"] },
      real_world: "같은 페이지를 두 번째 열 때 즉시 뜨는 이유",
    },
    {
      concept: "JWT (JSON 웹 토큰)",
      tagline: "위조 못 하는 손목밴드로 '나'를 증명한다",
      analogy: { name: "본부에 전화 안 해도 입구에서 확인되는 페스티벌 손목밴드", icon: "🎫" },
      comparison: {
        without: { icon: "📞", label: "세션 조회", steps: ["세션 ID를 보냄", "서버가 DB에 '이 사람 누구?'", "DB가 답함"], metric: "요청마다 DB 조회" },
        with: { icon: "🎫", label: "JWT", steps: ["서명된 토큰을 보냄", "서버가 서명만 로컬 검증"], metric: "DB 조회 없음" },
      },
      tradeoffs: { pros: ["요청마다 DB 조회 안 함", "여러 서버에서 통함"], cons: ["만료 전엔 취소가 까다로움", "세션 ID보다 큼"] },
      real_world: "여러 백엔드 서버를 오가도 로그인이 유지되는 원리",
    },
    {
      concept: "웹훅 (Webhook)",
      tagline: "네가 묻지 마 — 일이 생기면 우리가 알려줄게",
      analogy: { name: "매번 문을 확인하는 대신 초인종을 다는 것", icon: "🔔" },
      comparison: {
        without: { icon: "🔁", label: "폴링", steps: ["몇 초마다 '새 소식?'", "대부분 답은 '없음'", "낭비된 호출"], metric: "수천 번 헛조회" },
        with: { icon: "🔔", label: "웹훅", steps: ["URL을 한 번 등록", "일이 생기는 순간 그쪽이 POST"], metric: "헛조회 0" },
      },
      tradeoffs: { pros: ["즉시", "낭비 요청 없음"], cons: ["공개 엔드포인트를 열어야 함", "재시도·중복 처리 필요"] },
      real_world: "Stripe가 결제 성공을 그 즉시 너의 앱에 알려주는 방식",
    },
  ],
};

const PLAN: Record<Lang, PlanData> = {
  en: {
    title: "Add Stripe checkout",
    phase: "working",
    steps: [
      { name: "Create the checkout API route", status: "done" },
      { name: "Wire the payment button", status: "now" },
      { name: "Add the webhook handler", status: "todo" },
      { name: "Test with a real card", status: "todo" },
    ],
    current_action: "Editing CheckoutButton.tsx",
    elapsed_s: 42,
    eta_hint: "~3 steps left",
    files_touched: ["api/checkout.ts", "CheckoutButton.tsx"],
  },
  ko: {
    title: "Stripe 결제 붙이기",
    phase: "working",
    steps: [
      { name: "결제 API 경로 만들기", status: "done" },
      { name: "결제 버튼 연결", status: "now" },
      { name: "웹훅 핸들러 추가", status: "todo" },
      { name: "실제 카드로 테스트", status: "todo" },
    ],
    current_action: "CheckoutButton.tsx 수정 중",
    elapsed_s: 42,
    eta_hint: "약 3단계 남음",
    files_touched: ["api/checkout.ts", "CheckoutButton.tsx"],
  },
};

const RECAP: Record<Lang, RecapData> = {
  en: {
    headline: "Checkout flow wired up and building clean",
    tone: "success",
    changed: [
      { what: "Added the checkout API", path: "api/checkout.ts", change: "added", lines: 48 },
      { what: "Connected the pay button", path: "CheckoutButton.tsx", change: "edited", lines: 12 },
      { what: "Removed the old mock payment", path: "mockPay.ts", change: "deleted", lines: 30 },
    ],
    next_step: "Test a real payment in Stripe test mode",
  },
  ko: {
    headline: "결제 흐름 연결 완료, 빌드도 깨끗",
    tone: "success",
    changed: [
      { what: "결제 API 추가", path: "api/checkout.ts", change: "added", lines: 48 },
      { what: "결제 버튼 연결", path: "CheckoutButton.tsx", change: "edited", lines: 12 },
      { what: "옛날 목(mock) 결제 제거", path: "mockPay.ts", change: "deleted", lines: 30 },
    ],
    next_step: "Stripe 테스트 모드에서 실제 결제 해보기",
  },
};

const QUESTION: Record<Lang, QuestionData> = {
  en: {
    question: "How should we store user sessions?",
    context: "For the new sign-up page",
    options: [
      { label: "Browser cookie", hint: "Simplest", pros: ["Nothing extra to run"], cons: ["Limited size"], recommended: true },
      { label: "Redis store", hint: "Scales big", pros: ["Handles millions of users"], cons: ["One more service to run & pay for"] },
    ],
    urgency: "blocking",
    default_hint: "Cookies are fine until you have thousands of users",
  },
  ko: {
    question: "사용자 세션을 어디에 저장할까?",
    context: "새 가입 페이지용",
    options: [
      { label: "브라우저 쿠키", hint: "가장 간단", pros: ["추가로 돌릴 게 없음"], cons: ["용량 제한"], recommended: true },
      { label: "Redis 저장소", hint: "크게 확장됨", pros: ["수백만 사용자 처리"], cons: ["운영·비용 드는 서비스 하나 더"] },
    ],
    urgency: "blocking",
    default_hint: "수천 명 되기 전엔 쿠키로 충분해",
  },
};

const MERMAID_FLOW: Record<Lang, MermaidData> = {
  en: {
    title: "Checkout flow",
    caption: "How a payment travels from the customer all the way to a created order.",
    intent: "flow",
    code: `flowchart LR
  A([Customer]) --> B[Checkout page]
  B --> C{Pay?}
  C -->|Card| D[Stripe]
  D --> E[[Webhook]]
  E --> F([Order created])`,
  },
  ko: {
    title: "결제 흐름",
    caption: "결제가 고객에서 주문 생성까지 어떻게 흐르는지.",
    intent: "flow",
    code: `flowchart LR
  A([고객]) --> B[결제 페이지]
  B --> C{결제?}
  C -->|카드| D[Stripe]
  D --> E[[웹훅]]
  E --> F([주문 생성])`,
  },
};

const ROADMAP: Record<Lang, MermaidData> = {
  en: {
    title: "Roadmap",
    caption: "Checkout is the milestone in progress — Auth is done; Analytics and Mobile come next.",
    intent: "timeline",
    code: `gantt
  dateFormat YYYY-MM-DD
  axisFormat %b
  section MVP
  Auth        :done, 2026-01-01, 20d
  Checkout    :active, 2026-01-21, 18d
  section Growth
  Analytics   :2026-02-15, 20d
  Mobile app  :2026-03-10, 30d`,
  },
  ko: {
    title: "로드맵",
    caption: "지금은 결제가 진행 중 — 인증은 끝, 분석·모바일이 다음.",
    intent: "timeline",
    code: `gantt
  dateFormat YYYY-MM-DD
  axisFormat %b
  section MVP
  인증        :done, 2026-01-01, 20d
  결제        :active, 2026-01-21, 18d
  section 성장
  분석        :2026-02-15, 20d
  모바일 앱   :2026-03-10, 30d`,
  },
};

export function VizDemo() {
  const { t, lang } = useT();
  const [kind, setKind] = useState<Kind>("plan");
  const [conceptIdx, setConceptIdx] = useState(0);
  const [replay, setReplay] = useState(0);

  const concepts = CONCEPTS[lang];
  const pick = Math.min(conceptIdx, concepts.length - 1);
  const animKey = `${lang}-${kind}-${pick}-${replay}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* kind switcher */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => {
              setKind(k.kind);
              setReplay((n) => n + 1);
            }}
            style={{ fontWeight: kind === k.kind ? 700 : 400, color: kind === k.kind ? c.accent : c.muted }}
          >
            {t(k.tkey)}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => setReplay((n) => n + 1)}>
          ↻ {t("demo.replay")}
        </button>
      </div>

      {/* concept sub-picker */}
      {kind === "concept" && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: c.dim, fontSize: 12 }}>{t("demo.pick")}</span>
          {concepts.map((s, i) => (
            <button
              key={s.concept}
              type="button"
              onClick={() => {
                setConceptIdx(i);
                setReplay((n) => n + 1);
              }}
              style={{ fontWeight: i === pick ? 700 : 400, color: i === pick ? c.accent : c.muted }}
            >
              {s.concept}
            </button>
          ))}
        </div>
      )}

      <span style={{ color: c.dim, fontSize: 11 }}>{t("demo.note")}</span>

      {kind === "concept" && <ConceptCard key={animKey} data={concepts[pick]} />}
      {kind === "plan" && (
        <>
          <PlanCard key={`${animKey}-p`} data={PLAN[lang]} />
          <div style={{ fontSize: 11, color: c.dim, margin: "2px 0 -2px" }}>{t("demo.roadmapLabel")}</div>
          <MermaidCard key={`${animKey}-r`} data={ROADMAP[lang]} />
        </>
      )}
      {kind === "recap" && <RecapCard key={animKey} data={RECAP[lang]} />}
      {kind === "question" && <QuestionCard key={animKey} data={QUESTION[lang]} />}
      {kind === "mermaid" && <MermaidCard key={animKey} data={MERMAID_FLOW[lang]} />}
    </div>
  );
}

// @ddalkkak/shared — the LOCKED viz vocabulary (v1).
//
// This is the make-the-standard-ONCE contract. The product does NOT hand-code a
// renderer per data type; instead the user's BYO LLM maps ANY input signal onto one
// of these locked `VizKind`s + fills its data, and we render it. Two escape hatches
// (`mermaid` for any structure, `concept` for any unknown tech) plus `note` (totality
// fallback) guarantee that *anything* — even something we never anticipated — maps to
// a kind. Adding a kind is an additive, versioned change; renaming/removing is not.
//
// Designed via the viz-vocabulary-design workflow (viz-core's 24 kinds + 3 proposals
// → synthesized). Human reference + rationale + what was cut: docs/VIZ_VOCABULARY.md.

export const VIZ_VOCAB_VERSION = 1 as const;

/** The locked set. Every renderable viz is exactly one of these. */
export type VizKind =
  | "plan" // 🤖 what Claude is about to do + how far along (live checklist + heartbeat)
  | "recap" // 🤖 what Claude just finished + files + next step (also the human face of git activity)
  | "question" // 🤖 Claude is blocked, founder's turn: a choice with labeled options + tradeoffs
  | "diff" // 📝 one file's before→after (small targeted edit vs huge rewrite = a 0.5s risk signal)
  | "concept" // 🧠 explain an unknown tech via analogy + before/after + pros/cons (escape hatch #1)
  | "metric" // 📈 business health as big-number cards with trend arrows
  | "trend" // 📈 one chart when the SHAPE tells the story (line | bar | funnel)
  | "mermaid" // 🔌 any structure/sequence/timeline/state — infinite escape hatch (#2), with a caption
  | "note" // 🔌 totality safety net: a titled plain-language card so ANYTHING maps to something
  | "none"; // 🤫 explicit silence — no visual warranted (keeps the glance surface calm)

/** Which class of raw signal a viz was derived from. */
export type VizInput = "change" | "llm_work" | "concept" | "metric";

// ── per-kind data schemas ──────────────────────────────────────────────────

export interface PlanData {
  title: string;
  phase: "planning" | "working" | "done" | "stuck";
  steps: { name: string; status: "done" | "now" | "todo" }[];
  current_action?: string;
  elapsed_s?: number;
  eta_hint?: string;
  files_touched?: string[];
}

export interface RecapData {
  headline: string;
  tone: "success" | "warning" | "error";
  changed: { what: string; path?: string; change?: "added" | "edited" | "deleted"; lines?: number }[];
  next_step?: string;
}

export interface QuestionData {
  question: string;
  context?: string;
  options: { label: string; hint?: string; pros?: string[]; cons?: string[]; recommended?: boolean }[];
  urgency: "blocking" | "fyi";
  default_hint?: string;
}

export interface DiffData {
  file: string;
  before: string;
  after: string;
  lang: string;
  summary?: string;
}

export interface ConceptData {
  concept: string;
  tagline: string;
  analogy: { name: string; icon: string };
  comparison: {
    without: { icon: string; label: string; steps: string[]; metric: string };
    with: { icon: string; label: string; steps: string[]; metric: string };
  };
  tradeoffs: { pros: string[]; cons: string[] };
  real_world: string;
}

export interface MetricData {
  cards: {
    label: string;
    value: string;
    max?: number;
    unit?: string;
    trend?: "up" | "down" | "flat";
    delta?: string;
    good?: boolean;
  }[];
}

export interface TrendData {
  title: string;
  shape: "line" | "bar" | "funnel";
  labels: string[];
  series: { label: string; values: number[]; color?: string }[];
  unit?: string;
  highlight_last?: boolean;
}

export interface MermaidData {
  title: string;
  caption: string; // REQUIRED plain-language one-liner — the non-engineer reads this, not the diagram
  code: string;
  intent?: "history" | "architecture" | "flow" | "sequence" | "timeline" | "state";
}

export interface NoteData {
  title: string;
  tone: "info" | "success" | "warning" | "error";
  body?: string;
  bullets?: string[];
}

export interface NoneData {
  reason?: string;
}

/** A viz payload the BYO LLM emits — discriminated on `kind`, so each renderer narrows. */
export type VizPayload =
  | { kind: "plan"; data: PlanData }
  | { kind: "recap"; data: RecapData }
  | { kind: "question"; data: QuestionData }
  | { kind: "diff"; data: DiffData }
  | { kind: "concept"; data: ConceptData }
  | { kind: "metric"; data: MetricData }
  | { kind: "trend"; data: TrendData }
  | { kind: "mermaid"; data: MermaidData }
  | { kind: "note"; data: NoteData }
  | { kind: "none"; data: NoneData };

/** Map of each kind → the data type it carries (for renderer typing). */
export interface VizDataByKind {
  plan: PlanData;
  recap: RecapData;
  question: QuestionData;
  diff: DiffData;
  concept: ConceptData;
  metric: MetricData;
  trend: TrendData;
  mermaid: MermaidData;
  note: NoteData;
  none: NoneData;
}

/** Iteration order + existence check for the locked set. */
export const VIZ_KINDS: readonly VizKind[] = [
  "plan",
  "recap",
  "question",
  "diff",
  "concept",
  "metric",
  "trend",
  "mermaid",
  "note",
  "none",
] as const;

export function isVizKind(s: string): s is VizKind {
  return (VIZ_KINDS as readonly string[]).includes(s);
}

/**
 * Selector guidance: for each input class, the primary kind to try + ordered
 * fallbacks. The BYO LLM uses this as a hint; it may override per signal. `note`
 * and `none` always sit at the end of every chain as the totality guarantee.
 */
export const VIZ_INPUT_MAP: Record<VizInput, { primary: VizKind; fallbacks: VizKind[] }> = {
  llm_work: { primary: "plan", fallbacks: ["question", "recap", "mermaid", "note", "none"] },
  change: { primary: "recap", fallbacks: ["diff", "plan", "mermaid", "note", "none"] },
  concept: { primary: "concept", fallbacks: ["mermaid", "note", "none"] },
  metric: { primary: "metric", fallbacks: ["trend", "note", "none"] },
};

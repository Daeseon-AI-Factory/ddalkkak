# Viz Vocabulary (LOCKED v1)

> The make-the-standard-**once** contract for DalkkakAI's viz layer.

We do **not** hand-code a renderer per data type. The user's BYO LLM (Claude Code) maps **any** input signal
onto one of these locked `VizKind`s and fills its data; we render it. Two escape hatches — **`mermaid`** (any
structure) and **`concept`** (any unknown tech) — plus **`note`** (totality fallback) guarantee that *anything*,
even something we never anticipated, maps to a kind. **This is how "visualize anything unknown" works.**

Machine-checked contract: [`packages/shared/src/viz.ts`](../packages/shared/src/viz.ts). Adding a kind is additive + versioned; renaming/removing is a breaking change.

Designed via the `viz-vocabulary-design` workflow: viz-core's 24 kinds + 3 independent proposals (minimalist / coverage / persona-first) → synthesized. 4 agents.


---


## Input → kind

The viz layer classifies each raw signal into one of four input classes, then the LLM picks a kind (primary first, fallbacks in order; `note`/`none` always close every chain):


| Input class | What it is | Primary | Fallbacks |
|---|---|---|---|
| `llm_work` | Claude's plans, summaries, questions | **`plan`** | `question`, `recap`, `mermaid`, `note`, `none` |
| `change` | git commits / files touched | **`recap`** | `diff`, `plan`, `mermaid`, `note`, `none` |
| `concept` | an unknown tech word | **`concept`** | `mermaid`, `note`, `none` |
| `metric` | business numbers (later phase) | **`metric`** | `trend`, `note`, `none` |

---


## The 10 kinds


### 🤖 `plan`

*Inputs: `llm_work`, `change`*


The headline llm_work kind. One live card that answers 'what is Claude about to do, and how far along is it?' — an ordered checklist with the current step highlighted, plus an ambient phase/heartbeat so the founder can tell working-vs-stuck at a glance.


**Data schema**

```ts
interface PlanData { title: string; phase: "planning" | "working" | "done" | "stuck"; steps: { name: string; status: "done" | "now" | "todo" }[]; current_action?: string; elapsed_s?: number; eta_hint?: string; files_touched?: string[] }
```

**Example**

```json
{
  "title": "Add Stripe checkout",
  "phase": "working",
  "steps": [
    {
      "name": "Create checkout API route",
      "status": "done"
    },
    {
      "name": "Wire the payment button",
      "status": "now"
    },
    {
      "name": "Add the webhook handler",
      "status": "todo"
    },
    {
      "name": "Test with a card",
      "status": "todo"
    }
  ],
  "current_action": "Editing CheckoutButton.tsx",
  "elapsed_s": 42,
  "eta_hint": "~3 steps left",
  "files_touched": [
    "api/checkout.ts"
  ]
}
```

<sub>Why locked: This is the exact feature the founder asked for ('about to do X, Y, Z') and maps the augmentor's two most frequent event classes — activity (state=thinking) and tool-call — onto ONE renderer. All three proposals locked a plan/flow kind; I fold Proposal 3's standalone `activity` pulse into it via `phase`+`current_action`+`elapsed_s` instead of building a second renderer, because a lone pulse is too thin to earn a slot and the live 'now' step IS the alive-vs-frozen signal. A vertical checklist with a glowing now-row plus a heartbeat is the single most reassuring 0.5s read for someone who can't parse the terminal. Renders as plain CSS rows, zero deps.</sub>


### 🤖 `recap`

*Inputs: `llm_work`, `change`*


Claude's SUMMARY of what it just finished, and the human-readable face of git activity: a colored one-line outcome, a plain-language list of what changed, and the single next step — so the founder can relax or redirect.


**Data schema**

```ts
interface RecapData { headline: string; tone: "success" | "warning" | "error"; changed: { what: string; path?: string; change?: "added" | "edited" | "deleted"; lines?: number }[]; next_step?: string }
```

**Example**

```json
{
  "headline": "Checkout flow wired up and building clean",
  "tone": "success",
  "changed": [
    {
      "what": "Added the checkout API",
      "path": "api/checkout.ts",
      "change": "added",
      "lines": 48
    },
    {
      "what": "Connected the pay button",
      "path": "CheckoutButton.tsx",
      "change": "edited",
      "lines": 12
    }
  ],
  "next_step": "Test a real payment in Stripe test mode"
}
```

<sub>Why locked: Mirrors the augmentor's `completion` event plus files_touched/next_step — viz-core has NO single kind for 'what just happened + files + next step' and would force a table+badge combo. Proposals 2 and 3 both independently invented this, which is strong signal it earns a slot. It doubles as the founder-friendly representation of input-type-1 git activity: the LLM translates raw hunks into plain 'what' phrases (each row carries optional path/change/lines so the non-engineer feels scope/risk without reading code). The `tone` field absorbs viz-core's `badge` semantics inline, killing a separate badge kind.</sub>


### 🤖 `question`

*Inputs: `llm_work`*


The blocking-choice kind: Claude is stuck and it's the founder's turn. A question plus 2-4 labeled options with plain-language tradeoffs and a recommended flag, so a non-engineer can pick confidently in seconds.


**Data schema**

```ts
interface QuestionData { question: string; context?: string; options: { label: string; hint?: string; pros?: string[]; cons?: string[]; recommended?: boolean }[]; urgency: "blocking" | "fyi"; default_hint?: string }
```

**Example**

```json
{
  "question": "How should we store user sessions?",
  "context": "For the new sign-up page",
  "options": [
    {
      "label": "Browser cookie",
      "hint": "Simplest",
      "pros": [
        "No extra service to run"
      ],
      "cons": [
        "Limited size"
      ],
      "recommended": true
    },
    {
      "label": "Redis store",
      "hint": "Scales big",
      "pros": [
        "Handles millions of users"
      ],
      "cons": [
        "One more thing to run and pay for"
      ]
    }
  ],
  "urgency": "blocking",
  "default_hint": "Cookies is fine until you have thousands of users"
}
```

<sub>Why locked: The brief explicitly says: if no proposal nailed 'Claude is asking me to choose', design a clean one. The augmentor emits a first-class prompt/blocked event (index.ts case 2) and the founder is literally the bottleneck — a silently-waiting agent is the worst UX. viz-core has nothing for 'A/B/C with tradeoffs' (`whatif` is one-change impact, not multiple choice). I merge Proposal 3's `question` skeleton with Proposal 2's recommended-flagged pros/cons options. Big tappable option cards, no canvas. This is the founder's #1 reason to look at the screen, so it gets its own unmistakable layout rather than living inside plan.</sub>


### 📝 `diff`

*Inputs: `change`, `llm_work`*


A single focused before/after code change for one file edit. The founder won't read the code deeply, but 'small targeted change vs huge rewrite' is itself a 0.5s scope/risk signal.


**Data schema**

```ts
interface DiffData { file: string; before: string; after: string; lang: string; summary?: string }
```

**Example**

```json
{
  "file": "src/pricing.ts",
  "before": "const PRICE = 9",
  "after": "const PRICE = 12",
  "lang": "ts",
  "summary": "Raised the plan price from $9 to $12"
}
```

<sub>Why locked: Reused near-verbatim from viz-core (added an optional plain-language `summary` so the founder reads the sentence, not the token stream). Proposals 1 and 2 both keep it; Proposal 3 cut it but its own rationale concedes the 'small vs huge change' signal still matters. A two-column before/after needs its own renderer and is the smallest honest representation of a concrete edit. New-file / command / no-before cases collapse into this with an empty `before`, so I cut viz-core's separate `code` kind.</sub>


### 🧠 `concept`

*Inputs: `concept`*


Escape hatch #1 (unknown tech): when Claude says a word the founder doesn't know (JWT, caching, queue, webhook), explain it via analogy + before/after + pros/cons + real-world so they 'get it' instantly.


**Data schema**

```ts
interface ConceptData { concept: string; tagline: string; analogy: { name: string; icon: string }; comparison: { without: { icon: string; label: string; steps: string[]; metric: string }; with: { icon: string; label: string; steps: string[]; metric: string } }; tradeoffs: { pros: string[]; cons: string[] }; real_world: string }
```

**Example**

```json
{
  "concept": "Caching",
  "tagline": "Remember the answer so you don't redo the work",
  "analogy": {
    "name": "A barista memorizing your usual order",
    "icon": "coffee"
  },
  "comparison": {
    "without": {
      "icon": "snail",
      "label": "No cache",
      "steps": [
        "Ask the database every time",
        "Wait",
        "Same answer again"
      ],
      "metric": "800ms"
    },
    "with": {
      "icon": "rabbit",
      "label": "With cache",
      "steps": [
        "Check memory first",
        "Found it",
        "Return instantly"
      ],
      "metric": "5ms"
    }
  },
  "tradeoffs": {
    "pros": [
      "Much faster",
      "Cheaper"
    ],
    "cons": [
      "Can show stale data"
    ]
  },
  "real_world": "Why a page loads instantly the second time you open it"
}
```

<sub>Why locked: Reused verbatim from viz-core — it is the single most important kind for a non-engineer and the only one purpose-built for 'I don't know this word'. All three proposals kept it whole. I retain viz-core's full nested steps/metric machinery (over Proposal 3's simplified variant) because the before/after step list with a concrete metric is what makes the speed/cost difference viscerally land. Escape hatch for the entire unknown-tech long tail: any concept maps here, so we never hand-code a per-concept renderer.</sub>


### 📈 `metric`

*Inputs: `metric`*


Business health as big-number cards with trend arrows — the later-phase 'are we growing?' 0.5s read. Merges kpi + gauge.


**Data schema**

```ts
interface MetricData { cards: { label: string; value: string; max?: number; unit?: string; trend?: "up" | "down" | "flat"; delta?: string; good?: boolean }[] }
```

**Example**

```json
{
  "cards": [
    {
      "label": "MRR",
      "value": "$1,240",
      "trend": "up",
      "delta": "+18%",
      "good": true
    },
    {
      "label": "Churn",
      "value": "4.2%",
      "trend": "down",
      "delta": "-0.5pt",
      "good": true
    },
    {
      "label": "Test coverage",
      "value": "82",
      "unit": "%",
      "max": 100,
      "good": true
    }
  ]
}
```

<sub>Why locked: Merges viz-core's `kpi` and `gauge` (Proposal 3's call, which I adopt): a giant value + green/red arrow beats a separate dial for a non-engineer, and a single number is just a one-card grid. The `good` flag (all three proposals added it) decouples direction from sentiment so churn-down reads green — the LLM decides, the renderer just colors. `value` is a string so it carries currency/units the LLM already formatted; optional `max`/`unit` cover the gauge-style 'X out of Y' case. Covers input-type-4 with one renderer instead of two.</sub>


### 📈 `trend`

*Inputs: `metric`, `change`*


One minimal chart when a SHAPE, not just a value, tells the story: a line over time, bars across categories, or a conversion funnel — picked by a `shape` field. Merges timeseries + bar + funnel.


**Data schema**

```ts
interface TrendData { title: string; shape: "line" | "bar" | "funnel"; labels: string[]; series: { label: string; values: number[]; color?: string }[]; unit?: string; highlight_last?: boolean }
```

**Example**

```json
{
  "title": "Sign-ups this week",
  "shape": "line",
  "labels": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri"
  ],
  "series": [
    {
      "label": "Sign-ups",
      "values": [
        12,
        19,
        9,
        24,
        31
      ]
    }
  ],
  "unit": "users",
  "highlight_last": true
}
```

<sub>Why locked: Deliberate merge of viz-core's timeseries + bar + funnel into ONE kind with a `shape` switch (Proposal 2's move, the cleanest of the three). For this persona they're the same mental object — 'a chart of a number' — and share one schema and one small SVG renderer with three branches. The `series` array (kept from Proposal 2 over Proposal 3's single-array) handles the occasional two-line compare without a fourth kind. This is the only place a non-engineer benefits from a real chart; heatmap/cohort/waterfall stay cut as too dense.</sub>


### 🔌 `mermaid`

*Inputs: `change`, `llm_work`, `concept`*


Escape hatch #2 (infinite structure): ANY relationship, sequence, timeline, state machine, architecture, dependency graph, user flow, or git history — with a REQUIRED plain-language caption that is the 0.5s read above the diagram.


**Data schema**

```ts
interface MermaidData { title: string; caption: string; code: string; intent?: "history" | "architecture" | "flow" | "sequence" | "timeline" | "state" }
```

**Example**

```json
{
  "title": "How sign-up works",
  "caption": "Plain version: user types email, we send a code, they're in",
  "intent": "flow",
  "code": "flowchart LR\n  A[Enter email] --> B[Get a code] --> C[Logged in]"
}
```

<sub>Why locked: Reused from viz-core as the infinite escape hatch and the reason the locked set stays small — this ONE kind absorbs viz-core's arch, depgraph, userflow, screenmap, journey, animation, waterfall, crud, kanban, and any gantt/timeline/gitGraph. Mermaid renders reliably in a WebKit/Tauri webview with no heavy canvas deps. I take Proposal 3's critical refinement: `caption` is REQUIRED so a non-engineer gets the gist even when the diagram is dense (caption = the glance, diagram = the lean-in). Optional `intent` lets the renderer pick a founder-friendly theme/direction.</sub>


### 🔌 `note`

*Inputs: `llm_work`, `change`, `concept`, `metric`*


Totality safety net: a titled plain-language card with a short message, optional bullets, and a tone — the guaranteed last-resort target so the BYO LLM can map ANYTHING, even unmapped, to something coherent.


**Data schema**

```ts
interface NoteData { title: string; tone: "info" | "success" | "warning" | "error"; body?: string; bullets?: string[] }
```

**Example**

```json
{
  "title": "Heads up",
  "tone": "warning",
  "body": "The payment test failed once but passed on retry.",
  "bullets": [
    "No action needed",
    "Watch for it in production"
  ]
}
```

<sub>Why locked: Merges viz-core's `code`, `badge`, and the long-tail of `table` into one trivial text card (Proposals 2 and 3 both landed here). A non-engineer is better served by a short readable sentence than a raw code block or a lone status pill. This is the load-bearing guarantee behind the 'must map ANYTHING' principle: it is distinct from `none` because `none` renders nothing while `note` renders a real human message when the LLM has something to say but no specialized shape fits.</sub>


### 🤫 `none`

*Inputs: `change`, `llm_work`, `concept`, `metric`*


Explicit silence: the input doesn't warrant a visual. Keeps the glance surface calm and prevents alert fatigue.


**Data schema**

```ts
interface NoneData { reason?: string }
```

**Example**

```json
{
  "reason": "Routine file read, nothing for the founder to see"
}
```

<sub>Why locked: Kept verbatim from viz-core; all three proposals retained it (as none/note-with-no-render). For an always-on autonomous tool, rendering NOTHING is a feature — most PTY lines are noise. A first-class 'don't render' option trains the LLM to be selective instead of padding, so when a card DOES appear, the founder trusts it's worth the glance. Distinct from `note`: `none` is silence, `note` is a message.</sub>


---


## Cut from viz-core's 24 (and why)


| Cut | Reason |
|---|---|
| `code` | The degenerate no-before case of diff. Folds into diff with an empty before, or into note for command output. A separate one-column renderer earns nothing. |
| `activity` | Proposal 3's standalone live pulse is too thin for its own renderer. Folded into plan via phase + current_action + elapsed_s — the live 'now' step already IS the alive-vs-frozen signal. |
| `card` | Same idea as note (titled tone + body + bullets); merged under the single name `note` to keep one canonical totality fallback. |
| `decision` | Proposal 2/3's two-column impact card overlaps question (options with tradeoffs for choices) and concept (without/with for tech). A technical or business 'A vs B' is a question with recommended options; a tech tradeoff is concept. No unique slot. |
| `whatif` | Impact comparison; absorbed by question (options + recommendation) for decisions and concept (without/with) for tech. No standalone glance value. |
| `map / treemap` | Proposal 2's churn treemap is borderline but a second bespoke renderer for input-1; recap (paths + change tags) and mermaid (architecture) cover 'where did Claude work' without it. Revisit only if hotspot-at-a-glance proves load-bearing in dogfood. |
| `badge` | A lone status pill is too low-information. Tone now lives inline in recap, note, and metric; live status lives in plan.phase. |
| `gauge` | Merged into metric — a big-number card with optional max/unit beats a separate dial for a non-engineer at the 0.5s bar. |
| `kpi` | Merged into metric (same big-number-with-trend concept, one renderer). The good flag carries the kpi sentiment. |
| `timeseries / bar / funnel` | Collapsed into one trend kind with a shape switch. Same mental object for this persona; one SVG renderer, three branches. |
| `table` | A non-engineer doesn't parse header/row grids at a glance — that's a dashboard, not a glance. Lists go to note.bullets; numeric compares to metric; structured relations to mermaid. |
| `flow` | Merged into plan, which already carries ordered done/now/todo steps with live context. A contextless step-flow is strictly weaker. |
| `animation` | Render-heavy, distracts from a calm glance surface, and any flow it shows is a static mermaid diagram or plan's live now-row. Liability per the renderer-reality principle. |
| `arch / depgraph / userflow / screenmap / journey` | All specific mermaid diagram types (flowchart/architecture). Folded into the mermaid escape hatch — the whole point of keeping it. |
| `kanban` | Multi-column board exceeds a 0.5s glance and overlaps plan for the single-stream solo agent. Portfolio-level boards are a product screen, not a per-event viz_kind. |
| `waterfall / heatmap / cohort / crud` | Distributed traces, time×metric matrices, retention matrices, permission grids — analyst/SRE/engineer artifacts, unreadable at a glance for a non-engineer. No plain restatement exists, so dropped outright (rare structural need falls back to mermaid). |

---


## Selection rationale


Locked at 11 kinds (9 visual + note + none). Selection method: I took the union of the three proposals plus viz-core's 24, then collapsed by the two design forces — minimalism (each kind = one React renderer) and the 0.5s non-engineer bar. The augmentor's real event shapes (packages/augmentor/src/index.ts: activity, tool-call, prompt, completion) drove the llm_work core. The viz package (packages/viz/src/index.ts) is still a placeholder, so nothing was already locked — this is a clean slate.

llm_work is first-class and gets THREE dedicated kinds because the founder reacts differently to each: plan (watch progress — about to do X,Y,Z), recap (relax/redirect — did X, files, next step), and question (act now — which approach? A/B/C). All three proposals converged on plan+recap; question was the one the brief flagged, so I built it clean by merging Proposal 3's question skeleton with Proposal 2's recommended-flagged pros/cons options. I rejected a separate `decision`/`whatif` kind because every 'A vs B' is either a question (choice with options) or a concept (tech tradeoff) — folding them avoids a near-duplicate renderer.

Key merges: kpi+gauge → metric; timeseries+bar+funnel → trend (shape switch); code+badge+table-tail → note; Proposal 3's activity pulse → plan.phase. Two escape hatches kept per the hard requirement: mermaid (infinite structure, with a REQUIRED plain caption — Proposal 3's best idea) absorbs ~10 viz-core kinds, and concept (unknown tech, kept verbatim with full step/metric machinery) handles the jargon long tail. note guarantees totality for genuinely-unmappable input; none guarantees calm silence. The only judgment-call cut I'd revisit in dogfood is Proposal 2's churn treemap (`map`) — genuinely useful for 'where did Claude work', but recap+mermaid cover it today and a bespoke positioned-rect renderer is a real cost, so it stays cut until the hotspot glance proves load-bearing.

Tradeoff accepted: diff survives despite the non-engineer persona (Proposal 3 cut it) because 'small targeted edit vs huge rewrite' is itself a 0.5s risk signal, and the two-column renderer is trivial. Files touched live in BOTH plan (live) and recap (post-hoc) by design — same data, different reaction moment. Every surviving kind renders in SVG/CSS/Mermaid with zero heavy canvas deps, satisfying the Tauri/WebKit renderer-reality constraint.

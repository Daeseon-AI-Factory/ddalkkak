//! THE session-summary popup — rendered once at app root, portaled to <body> so it's
//! centered on the whole window (not clipped inside a pane), big and scrollable. Reads
//! the open-summary store; renders the right card for the payload's kind.

import { createPortal } from "react-dom";
import { useT } from "../i18n";
import type { StringKey } from "../i18n/strings";
import { type SessionUsage, setSummary, useSummary } from "../summaryModal";
import { ConceptCard } from "./ConceptCard";
import { NoteCard } from "./NoteCard";
import { PlanCard } from "./PlanCard";
import { QuestionCard } from "./QuestionCard";
import { RecapCard } from "./RecapCard";
import { c } from "./tokens";

// biome-ignore lint/suspicious/noExplicitAny: payload comes from the BYO LLM, shape not statically known
function renderPayload(p: { kind: string; data?: any }) {
  // the model is inconsistent: sometimes {kind, data:{…}}, sometimes flat {kind, …fields}.
  const d = (p.data ?? p) as Record<string, unknown>;
  switch (p.kind) {
    case "recap":
      return (
        <RecapCard
          data={{
            headline: String(d.headline ?? d.title ?? ""),
            tone: (d.tone as "success" | "warning" | "error") ?? "success",
            changed: Array.isArray(d.changed) ? d.changed : [],
            next_step: d.next_step as string | undefined,
          }}
        />
      );
    case "plan":
      return (
        <PlanCard
          data={{
            title: String(d.title ?? ""),
            phase: (d.phase as "planning" | "working" | "done" | "stuck") ?? "working",
            steps: Array.isArray(d.steps) ? d.steps : [],
            current_action: d.current_action as string | undefined,
            files_touched: Array.isArray(d.files_touched) ? d.files_touched : undefined,
          }}
        />
      );
    case "question":
      return (
        <QuestionCard
          data={{
            question: String(d.question ?? ""),
            context: d.context as string | undefined,
            options: Array.isArray(d.options) ? d.options : [],
            urgency: (d.urgency as "blocking" | "fyi") ?? "fyi",
            default_hint: d.default_hint as string | undefined,
          }}
        />
      );
    case "note":
      return (
        <NoteCard
          data={{
            title: String(d.title ?? ""),
            tone: (d.tone as "info" | "success" | "warning" | "error") ?? "info",
            body: d.body as string | undefined,
            bullets: Array.isArray(d.bullets) ? d.bullets : undefined,
          }}
        />
      );
    case "concept":
      // biome-ignore lint/suspicious/noExplicitAny: best-effort fallback
      return <ConceptCard data={d as any} />;
    default:
      return (
        <NoteCard data={{ title: "Summary", tone: "info", body: JSON.stringify(p) }} />
      );
  }
}

/** Compact token count: 1234 → "1.2k", 1_600_000 → "1.6M". */
function fmt(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}

/** Real per-session token usage, summed from the transcript. Output tokens are the
 *  meaningful signal (cache_read dominates but is near-free); no $ because a Max
 *  subscription has no per-token bill — so we never fabricate a dollar figure. */
function UsageBar({ usage, t }: { usage: SessionUsage; t: (k: StringKey) => string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        alignItems: "center",
        fontSize: 12,
        color: c.muted,
        marginBottom: 14,
        paddingBottom: 12,
        borderBottom: `1px solid ${c.border}`,
      }}
    >
      <span>
        ✏️ {t("usage.output")} <b style={{ color: c.text }}>{fmt(usage.output)}</b>
      </span>
      <span>
        📥 {t("usage.input")} {fmt(usage.input)}
      </span>
      <span>
        ♻️ {t("usage.cache")} {fmt(usage.cache_read + usage.cache_creation)}
      </span>
      <span style={{ color: c.dim }}>
        · {usage.messages} {t("usage.turns")}
      </span>
      <span style={{ marginLeft: "auto", color: c.dim, fontSize: 11 }}>{t("usage.note")}</span>
    </div>
  );
}

export function SummaryModal() {
  const { t } = useT();
  const s = useSummary();
  if (!s) return null;

  return createPortal(
    // biome-ignore lint/a11y: click-backdrop-to-close is intentional
    <div
      onClick={() => setSummary(null)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(820px, 92vw)",
          maxHeight: "88vh",
          overflow: "auto",
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <strong style={{ color: c.text, fontSize: 16 }}>✨ {t("summary.title")}</strong>
          <button type="button" onClick={() => setSummary(null)} style={{ fontSize: 14 }}>
            ✕
          </button>
        </div>
        {s.usage && <UsageBar usage={s.usage} t={t} />}
        {s.state === "loading" && <p style={{ color: c.muted }}>{t("summary.loading")}</p>}
        {s.payload
          ? renderPayload(s.payload)
          : s.state !== "loading" &&
            s.error && (
              <pre
                style={{
                  color: s.usage ? c.muted : c.bad,
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  margin: 0,
                }}
              >
                {s.error}
              </pre>
            )}
      </div>
    </div>,
    document.body,
  );
}

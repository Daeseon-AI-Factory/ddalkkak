//! Live per-session status strip (hook-driven) + on-demand "✨ Summarize" (ADR-002):
//! click → the user's `claude -p` reads the session transcript → a recap/plan card.
//! Hidden on plain shells (no Claude activity seen).

import { useState } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import type { ActivityState } from "@ddalkkak/augmentor";
import { useT } from "../i18n";
import type { StringKey } from "../i18n/strings";
import { useSessionStatus } from "../sessionStatus";
import { ConceptCard } from "./ConceptCard";
import { PlanCard } from "./PlanCard";
import { QuestionCard } from "./QuestionCard";
import { RecapCard } from "./RecapCard";
import { c } from "./tokens";

const META: Record<ActivityState, { color: string; tkey: StringKey; pulse: boolean }> = {
  idle: { color: c.dim, tkey: "session.idle", pulse: false },
  thinking: { color: c.accent, tkey: "session.thinking", pulse: true },
  "tool-call": { color: c.good, tkey: "session.working", pulse: true },
  blocked: { color: c.bad, tkey: "session.blocked", pulse: true },
  completed: { color: c.good, tkey: "session.done", pulse: false },
};

const DOT = { width: 7, height: 7, borderRadius: 999, flexShrink: 0 } as const;

type Summary =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; msg: string }
  | { kind: "done"; payload: { kind: string; data: unknown } };

// biome-ignore lint/suspicious/noExplicitAny: payload comes from the BYO LLM, shape not statically known
function renderPayload(p: { kind: string; data: any }) {
  const d = (p.data ?? {}) as Record<string, unknown>;
  switch (p.kind) {
    case "recap":
      return (
        <RecapCard
          data={{
            headline: String(d.headline ?? ""),
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
    case "concept":
      // biome-ignore lint/suspicious/noExplicitAny: best-effort fallback
      return <ConceptCard data={d as any} />;
    default:
      return (
        <pre style={{ color: c.muted, fontSize: 12, whiteSpace: "pre-wrap", margin: 0 }}>
          {JSON.stringify(p, null, 2)}
        </pre>
      );
  }
}

export function SessionStatusBar({ id }: { id: string }) {
  const { t } = useT();
  const s = useSessionStatus(id);
  const [summary, setSummary] = useState<Summary>({ kind: "idle" });

  if (s.updatedAt === 0) return null; // plain shell, no Claude activity seen

  const m = META[s.state];

  const run = async () => {
    if (!s.tpath) return;
    setSummary({ kind: "loading" });
    try {
      const payload = await invoke<{ kind: string; data: unknown }>("summarize_session", {
        transcriptPath: s.tpath,
      });
      setSummary({ kind: "done", payload });
    } catch (e) {
      setSummary({ kind: "error", msg: String(e) });
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "3px 10px",
          fontSize: 11,
          background: "#0b0f16",
          borderBottom: `1px solid ${c.border}`,
          color: c.muted,
          flexShrink: 0,
        }}
      >
        {m.pulse ? (
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.4 }}
            style={{ ...DOT, background: m.color }}
          />
        ) : (
          <span style={{ ...DOT, background: m.color }} />
        )}
        <span style={{ color: m.color, fontWeight: 600 }}>{t(m.tkey)}</span>
        {s.lastTool && s.state === "tool-call" && <span style={{ color: c.dim }}>· {s.lastTool}</span>}
        {s.tpath && (
          <button
            type="button"
            onClick={() => void run()}
            title={t("session.summarize")}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "none",
              color: c.accent,
              cursor: "pointer",
              fontSize: 11,
              padding: "0 4px",
            }}
          >
            ✨ {t("session.summarize")}
          </button>
        )}
      </div>

      {summary.kind !== "idle" && (
        // biome-ignore lint/a11y: click-backdrop-to-close is intentional
        <div
          onClick={() => setSummary({ kind: "idle" })}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(680px, 92vw)",
              maxHeight: "86vh",
              overflow: "auto",
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong style={{ color: c.text }}>✨ {t("summary.title")}</strong>
              <button type="button" onClick={() => setSummary({ kind: "idle" })}>
                ✕
              </button>
            </div>
            {summary.kind === "loading" && <p style={{ color: c.muted }}>{t("summary.loading")}</p>}
            {summary.kind === "error" && (
              <pre style={{ color: c.bad, fontSize: 12, whiteSpace: "pre-wrap", margin: 0 }}>{summary.msg}</pre>
            )}
            {summary.kind === "done" && renderPayload(summary.payload)}
          </div>
        </div>
      )}
    </>
  );
}

//! Live per-session status strip (hook-driven) + a "✨ Summarize" button. The button
//! reads the session's in-line card from the transcript and opens it in the shared,
//! centered popup (summaryModal store → SummaryModal at app root). Hidden on plain shells.

import { motion } from "framer-motion";
import type { ActivityState } from "@ddalkkak/augmentor";
import { useT } from "../i18n";
import type { StringKey } from "../i18n/strings";
import { useSessionStatus } from "../sessionStatus";
import { openSummaryFor } from "../summaryActions";
import { c } from "./tokens";

const META: Record<ActivityState, { color: string; tkey: StringKey; pulse: boolean }> = {
  idle: { color: c.dim, tkey: "session.idle", pulse: false },
  thinking: { color: c.accent, tkey: "session.thinking", pulse: true },
  "tool-call": { color: c.good, tkey: "session.working", pulse: true },
  blocked: { color: c.bad, tkey: "session.blocked", pulse: true },
  completed: { color: c.good, tkey: "session.done", pulse: false },
};

const DOT = { width: 7, height: 7, borderRadius: 999, flexShrink: 0 } as const;

export function SessionStatusBar({ id }: { id: string }) {
  const { t } = useT();
  const s = useSessionStatus(id);

  if (s.updatedAt === 0) return null; // plain shell, no Claude activity seen

  const m = META[s.state];

  const run = () => void openSummaryFor(id, t("summary.none"));

  return (
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
      <button
        type="button"
        onClick={run}
        title={`${t("session.summarize")} (⌘I)`}
        style={{
          marginLeft: "auto",
          background: "transparent",
          border: "none",
          color: s.tpath ? c.accent : c.dim,
          cursor: "pointer",
          fontSize: 11,
          padding: "0 4px",
        }}
      >
        ✨ {t("session.summarize")}
      </button>
    </div>
  );
}

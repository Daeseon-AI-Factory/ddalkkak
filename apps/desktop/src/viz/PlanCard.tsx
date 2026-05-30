//! `plan` renderer — what Claude is about to do + how far along (live checklist).
//! The "now" step pulses and a phase dot beats so the founder can tell working-vs-stuck
//! at a glance; a progress bar fills to the done ratio.

import { motion } from "framer-motion";
import type { PlanData } from "@ddalkkak/shared";
import { useT } from "../i18n";
import type { StringKey } from "../i18n/strings";
import { container, item } from "./anim";
import { c, radius } from "./tokens";

const PHASE: Record<PlanData["phase"], { color: string; tkey: StringKey }> = {
  planning: { color: c.accent, tkey: "plan.planning" },
  working: { color: c.good, tkey: "plan.working" },
  done: { color: c.good, tkey: "plan.done" },
  stuck: { color: c.bad, tkey: "plan.stuck" },
};

function clock(s?: number): string {
  if (s == null) return "";
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export function PlanCard({ data }: { data: PlanData }) {
  const { t } = useT();
  const ph = PHASE[data.phase];
  const done = data.steps.filter((s) => s.status === "done").length;
  const pct = data.steps.length ? Math.round((done / data.steps.length) * 100) : 0;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: radius.md, overflow: "hidden" }}
    >
      <motion.div
        variants={item}
        style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: c.text }}>{data.title}</div>
          {data.current_action && <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>{data.current_action}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {data.phase === "working" && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.4 }}
              style={{ width: 8, height: 8, borderRadius: radius.pill, background: ph.color }}
            />
          )}
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: ph.color }}>{t(ph.tkey)}</span>
          {data.elapsed_s != null && <span style={{ fontSize: 12, color: c.dim, fontVariantNumeric: "tabular-nums" }}>{clock(data.elapsed_s)}</span>}
        </div>
      </motion.div>

      <div style={{ height: 3, background: c.panel }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }} style={{ height: "100%", background: ph.color }} />
      </div>

      <div style={{ padding: "12px 20px" }}>
        {data.steps.map((s, i) => (
          <motion.div
            // biome-ignore lint/suspicious/noArrayIndexKey: stable ordered list
            key={i}
            variants={item}
            style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0" }}
          >
            {s.status === "done" ? (
              <span style={{ width: 18, height: 18, borderRadius: radius.pill, background: c.good, color: c.bg, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✓</span>
            ) : s.status === "now" ? (
              <motion.span
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.4 }}
                style={{ width: 18, height: 18, borderRadius: radius.pill, border: `2px solid ${ph.color}`, flexShrink: 0 }}
              />
            ) : (
              <span style={{ width: 18, height: 18, borderRadius: radius.pill, border: `2px solid ${c.dim}`, flexShrink: 0, opacity: 0.5 }} />
            )}
            <span
              style={{
                fontSize: 13.5,
                color: s.status === "todo" ? c.dim : c.text,
                fontWeight: s.status === "now" ? 700 : 400,
                textDecoration: s.status === "done" ? "line-through" : "none",
                opacity: s.status === "done" ? 0.7 : 1,
              }}
            >
              {s.name}
            </span>
          </motion.div>
        ))}
      </div>

      {(data.files_touched?.length || data.eta_hint) && (
        <motion.div
          variants={item}
          style={{ padding: "10px 20px", borderTop: `1px solid ${c.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {data.files_touched?.length ? <span style={{ fontSize: 11, color: c.dim }}>{t("plan.files")}:</span> : null}
            {data.files_touched?.map((f) => (
              <span key={f} style={{ fontSize: 11, color: c.muted, background: c.panel, padding: "2px 7px", borderRadius: 6, fontFamily: "ui-monospace, monospace" }}>
                {f}
              </span>
            ))}
          </div>
          {data.eta_hint && <span style={{ fontSize: 11, color: c.dim }}>{data.eta_hint}</span>}
        </motion.div>
      )}
    </motion.div>
  );
}

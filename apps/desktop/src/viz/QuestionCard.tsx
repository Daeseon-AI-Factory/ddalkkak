//! `question` renderer — Claude is blocked and it's the founder's turn. Big tappable
//! option cards with plain pros/cons; the recommended one is highlighted so a
//! non-engineer can pick in seconds.

import { motion } from "framer-motion";
import type { QuestionData } from "@ddalkkak/shared";
import { useT } from "../i18n";
import type { StringKey } from "../i18n/strings";
import { container, item, pop } from "./anim";
import { c, radius } from "./tokens";

const URGENCY: Record<QuestionData["urgency"], { color: string; tkey: StringKey }> = {
  blocking: { color: c.bad, tkey: "question.blocking" },
  fyi: { color: c.dim, tkey: "question.fyi" },
};

export function QuestionCard({ data }: { data: QuestionData }) {
  const { t } = useT();
  const ur = URGENCY[data.urgency];
  const cols = Math.min(data.options.length, 2);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: radius.md, overflow: "hidden" }}
    >
      <motion.div variants={item} style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: c.text }}>{data.question}</div>
          <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: ur.color, border: `1px solid ${ur.color}`, borderRadius: radius.pill, padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
            {t(ur.tkey)}
          </span>
        </div>
        {data.context && <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>{data.context}</div>}
      </motion.div>

      <div style={{ padding: 16, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
        {data.options.map((o, i) => (
          <motion.div
            // biome-ignore lint/suspicious/noArrayIndexKey: stable ordered list
            key={i}
            variants={pop}
            style={{ border: `1px solid ${o.recommended ? c.good : c.border}`, borderRadius: radius.sm, padding: 14, background: o.recommended ? "rgba(63,185,80,0.06)" : c.panel, position: "relative" }}
          >
            {o.recommended && (
              <span style={{ position: "absolute", top: -9, left: 12, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: c.bg, background: c.good, borderRadius: radius.pill, padding: "2px 8px" }}>
                {t("question.recommended")}
              </span>
            )}
            <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{o.label}</div>
            {o.hint && <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{o.hint}</div>}
            <div style={{ marginTop: 8 }}>
              {o.pros?.map((p) => (
                <div key={`p-${p}`} style={{ fontSize: 12, display: "flex", gap: 6, padding: "2px 0" }}>
                  <span style={{ color: c.good, fontWeight: 700 }}>✓</span>
                  <span style={{ color: c.text }}>{p}</span>
                </div>
              ))}
              {o.cons?.map((con) => (
                <div key={`c-${con}`} style={{ fontSize: 12, display: "flex", gap: 6, padding: "2px 0" }}>
                  <span style={{ color: c.bad, fontWeight: 700 }}>✗</span>
                  <span style={{ color: c.muted }}>{con}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {data.default_hint && (
        <motion.div variants={item} style={{ padding: "10px 20px", borderTop: `1px solid ${c.border}`, fontSize: 12, color: c.dim }}>
          💡 {data.default_hint}
        </motion.div>
      )}
    </motion.div>
  );
}

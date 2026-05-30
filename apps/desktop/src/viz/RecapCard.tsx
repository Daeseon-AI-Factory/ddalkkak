//! `recap` renderer — what Claude just finished + what changed + the next step.
//! Tone colors the headline (success/warning/error); each change row carries a
//! signed verb (+ added / ~ edited / − deleted) so scope/risk reads without code.

import { motion } from "framer-motion";
import type { RecapData } from "@ddalkkak/shared";
import { useT } from "../i18n";
import { container, item } from "./anim";
import { c, radius } from "./tokens";

const TONE: Record<RecapData["tone"], { color: string; icon: string }> = {
  success: { color: c.good, icon: "✓" },
  warning: { color: c.warn, icon: "⚠" },
  error: { color: c.bad, icon: "✗" },
};

type ChangeKind = NonNullable<RecapData["changed"][number]["change"]>;
const CHANGE: Record<ChangeKind, { color: string; sign: string }> = {
  added: { color: c.good, sign: "+" },
  edited: { color: c.accent, sign: "~" },
  deleted: { color: c.bad, sign: "−" },
};

export function RecapCard({ data }: { data: RecapData }) {
  const { t } = useT();
  const tn = TONE[data.tone];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: radius.md, overflow: "hidden" }}
    >
      <motion.div
        variants={item}
        style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}`, display: "flex", gap: 10, alignItems: "center", background: `linear-gradient(135deg, ${tn.color}1a, transparent)` }}
      >
        <span style={{ width: 24, height: 24, borderRadius: radius.pill, background: tn.color, color: c.bg, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{tn.icon}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{data.headline}</span>
      </motion.div>

      <div style={{ padding: "8px 20px" }}>
        {data.changed.map((ch, i) => {
          const cm = ch.change ? CHANGE[ch.change] : null;
          return (
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: stable ordered list
              key={i}
              variants={item}
              style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "6px 0", borderBottom: i < data.changed.length - 1 ? `1px solid ${c.panel}` : "none" }}
            >
              <span style={{ color: cm?.color ?? c.muted, fontWeight: 800, fontSize: 13, width: 12, flexShrink: 0 }}>{cm?.sign ?? "•"}</span>
              <span style={{ fontSize: 13.5, color: c.text, flex: 1 }}>{ch.what}</span>
              {ch.path && <span style={{ fontSize: 11, color: c.dim, fontFamily: "ui-monospace, monospace" }}>{ch.path}</span>}
              {ch.lines != null && <span style={{ fontSize: 11, color: cm?.color ?? c.dim, fontWeight: 700 }}>{ch.lines}</span>}
            </motion.div>
          );
        })}
      </div>

      {data.next_step && (
        <motion.div
          variants={item}
          style={{ padding: "12px 20px", borderTop: `1px solid ${c.border}`, background: c.panel, display: "flex", gap: 8, alignItems: "center" }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: c.accent }}>{t("recap.next")}</span>
          <span style={{ fontSize: 13, color: c.text }}>→ {data.next_step}</span>
        </motion.div>
      )}
    </motion.div>
  );
}

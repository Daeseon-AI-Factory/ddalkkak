//! `note` renderer — the totality fallback: a titled, tone-colored card with an optional
//! plain body + bullets. The most common kind for a quick session summary.

import { motion } from "framer-motion";
import type { NoteData } from "@ddalkkak/shared";
import { container, item } from "./anim";
import { c, radius } from "./tokens";

const TONE: Record<NoteData["tone"], string> = {
  info: c.accent,
  success: c.good,
  warning: c.warn,
  error: c.bad,
};

export function NoteCard({ data }: { data: NoteData }) {
  const color = TONE[data.tone] ?? c.accent;
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: radius.md,
        overflow: "hidden",
      }}
    >
      <motion.div variants={item} style={{ padding: "16px 20px 8px", fontSize: 16, fontWeight: 800, color: c.text }}>
        {data.title}
      </motion.div>
      {data.body && (
        <motion.div variants={item} style={{ padding: "0 20px 14px", fontSize: 13.5, color: c.muted, lineHeight: 1.6 }}>
          {data.body}
        </motion.div>
      )}
      {data.bullets?.length ? (
        <motion.div variants={item} style={{ padding: "0 20px 16px" }}>
          {data.bullets.map((b) => (
            <div key={b} style={{ fontSize: 13, color: c.text, display: "flex", gap: 8, padding: "3px 0" }}>
              <span style={{ color }}>•</span>
              <span>{b}</span>
            </div>
          ))}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

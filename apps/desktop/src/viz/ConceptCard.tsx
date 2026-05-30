//! `concept` renderer — explain an unknown tech via analogy + before/after + pros/cons.
//!
//! Layout validated by viz-core's renderVizConcept (pure CSS, no canvas → reliable in
//! WebKit). Animation added with Framer Motion, used to CLARIFY not decorate: blocks
//! reveal top-down, the analogy chip springs in, and each before/after step staggers in
//! sequence so the eye follows the "steps" the way ByteByteGo teaches a flow.

import { motion, type Variants } from "framer-motion";
import type { ConceptData } from "@ddalkkak/shared";
import { useT } from "../i18n";
import { container, item, pop } from "./anim";
import { c, radius } from "./tokens";

const stepsWrap: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

const labelCss = {
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: 1,
  fontWeight: 700,
};

function Steps({ steps }: { steps: string[] }) {
  return (
    <motion.div variants={stepsWrap}>
      {steps.map((s, i) => (
        <motion.div
          // biome-ignore lint/suspicious/noArrayIndexKey: static sample list, order stable
          key={i}
          variants={item}
          style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 13 }}
        >
          <span
            style={{
              background: c.panel,
              color: c.muted,
              width: 18,
              height: 18,
              borderRadius: radius.pill,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {i + 1}
          </span>
          <span>{s}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

export function ConceptCard({ data }: { data: ConceptData }) {
  const { t } = useT();
  const { comparison: cmp, tradeoffs: tr, analogy: an } = data;
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: radius.md, overflow: "hidden" }}
    >
      {/* header: concept + tagline + analogy */}
      <motion.div
        variants={item}
        style={{
          background: "linear-gradient(135deg, rgba(88,166,255,0.12), rgba(63,185,80,0.06))",
          padding: "20px 24px",
          borderBottom: `1px solid ${c.border}`,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, color: c.accent, letterSpacing: "-0.3px" }}>{data.concept}</div>
        {data.tagline && <div style={{ fontSize: 14, color: c.text, marginTop: 6, lineHeight: 1.5 }}>{data.tagline}</div>}
        {an?.name && (
          <motion.div
            variants={pop}
            style={{
              marginTop: 12,
              padding: "10px 14px",
              background: "rgba(210,153,34,0.1)",
              border: `1px solid ${c.warn}`,
              borderRadius: radius.sm,
              fontSize: 13,
              color: c.text,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>{an.icon || "💡"}</span>
            <span>
              <strong style={{ color: c.warn }}>{t("viz.analogy")}:</strong> {an.name}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* comparison: without (red) / with (green) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${c.border}` }}>
        <motion.div variants={item} style={{ padding: "18px 22px", borderRight: `1px solid ${c.border}`, background: "rgba(248,81,73,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 28 }}>{cmp.without.icon}</span>
            <div>
              <div style={{ ...labelCss, color: c.bad }}>{t("viz.without")}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{cmp.without.label}</div>
            </div>
          </div>
          <Steps steps={cmp.without.steps} />
          {cmp.without.metric && (
            <div style={{ marginTop: 10, padding: "6px 12px", background: c.panel, borderRadius: 6, fontSize: 13, color: c.bad, fontWeight: 700, display: "inline-block" }}>
              ⏱ {cmp.without.metric}
            </div>
          )}
        </motion.div>
        <motion.div variants={item} style={{ padding: "18px 22px", background: "rgba(63,185,80,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 28 }}>{cmp.with.icon}</span>
            <div>
              <div style={{ ...labelCss, color: c.good }}>{t("viz.with")}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{cmp.with.label}</div>
            </div>
          </div>
          <Steps steps={cmp.with.steps} />
          {cmp.with.metric && (
            <div style={{ marginTop: 10, padding: "6px 12px", background: c.panel, borderRadius: 6, fontSize: 13, color: c.good, fontWeight: 700, display: "inline-block" }}>
              ⏱ {cmp.with.metric}
            </div>
          )}
        </motion.div>
      </div>

      {/* tradeoffs: pros / cons */}
      <motion.div variants={item} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${c.border}` }}>
        <div style={{ padding: "14px 22px", borderRight: `1px solid ${c.border}` }}>
          <div style={{ ...labelCss, color: c.good, marginBottom: 8 }}>{t("viz.pros")}</div>
          {tr.pros.map((p, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static sample list
            <div key={i} style={{ padding: "5px 0", fontSize: 13, display: "flex", gap: 7 }}>
              <span style={{ color: c.good, fontWeight: 700 }}>✓</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "14px 22px" }}>
          <div style={{ ...labelCss, color: c.bad, marginBottom: 8 }}>{t("viz.cons")}</div>
          {tr.cons.map((con, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static sample list
            <div key={i} style={{ padding: "5px 0", fontSize: 13, display: "flex", gap: 7 }}>
              <span style={{ color: c.bad, fontWeight: 700 }}>✗</span>
              <span>{con}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* real-world */}
      {data.real_world && (
        <motion.div variants={item} style={{ padding: "14px 22px", background: c.panel }}>
          <span style={{ ...labelCss, color: c.muted }}>💼 {t("viz.realWorld")}</span>
          <span style={{ fontSize: 13, color: c.text, marginLeft: 10 }}>{data.real_world}</span>
        </motion.div>
      )}
    </motion.div>
  );
}

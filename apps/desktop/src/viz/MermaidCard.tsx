//! `mermaid` renderer — the infinite-structure escape hatch: any flowchart, sequence,
//! timeline, gantt/roadmap, state machine from text. A REQUIRED plain-language caption
//! sits below — that's what the non-engineer actually reads; the diagram is support.
//! The diagram fills the width and is zoom/pan-able (wheel, drag, +/−/reset).
//! securityLevel "strict" sanitizes the SVG (LLM-generated code is rendered here later).

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import mermaid from "mermaid";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { MermaidData } from "@ddalkkak/shared";
import { container, item } from "./anim";
import { c, radius } from "./tokens";

// "base" + themeVariables = full control → match our design tokens so diagrams
// cohere with the cards (consistency is what makes it feel polished).
mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  theme: "base",
  flowchart: { curve: "basis", padding: 14, nodeSpacing: 38, rankSpacing: 48, htmlLabels: true },
  themeVariables: {
    darkMode: true,
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    fontSize: "15px",
    background: "#0d1117",
    primaryColor: "#1b2230",
    primaryTextColor: "#e6edf3",
    primaryBorderColor: "#58a6ff",
    secondaryColor: "#0d2440",
    tertiaryColor: "#161b22",
    lineColor: "#7d8590",
    textColor: "#e6edf3",
    nodeBorder: "#58a6ff",
    clusterBkg: "#161b22",
    clusterBorder: "#30363d",
    edgeLabelBackground: "#0d1117",
    titleColor: "#e6edf3",
    sectionBkgColor: "rgba(88,166,255,0.05)",
    altSectionBkgColor: "rgba(255,255,255,0.02)",
    gridColor: "#30363d",
    doneTaskBkgColor: "#238636",
    doneTaskBorderColor: "#3fb950",
    activeTaskBkgColor: "#1f6feb",
    activeTaskBorderColor: "#58a6ff",
    taskBkgColor: "#30363d",
    taskBorderColor: "#484f58",
    taskTextColor: "#e6edf3",
    taskTextDarkColor: "#0d1117",
    taskTextOutsideColor: "#e6edf3",
    todayLineColor: "#f85149",
  },
});

let seq = 0;

/** Drop mermaid's intrinsic max-width so the diagram scales up to fill the viewport. */
function makeResponsive(svg: string): string {
  return svg.replace(/style="max-width:[^"]*"/i, 'style="max-width:100%;width:100%;height:auto;"');
}

function ZoomBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: `1px solid ${c.border}`,
        background: c.panel,
        color: c.text,
        cursor: "pointer",
        fontSize: 15,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label}
    </button>
  );
}

export function MermaidCard({ data }: { data: MermaidData }) {
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const id = `mmd-${seq++}`;
    mermaid
      .render(id, data.code)
      .then((res) => {
        if (alive) {
          setSvg(makeResponsive(res.svg));
          setFailed(false);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [data.code]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: radius.md, overflow: "hidden" }}
    >
      <motion.div variants={item} style={{ padding: "14px 20px 8px", fontSize: 15, fontWeight: 800, color: c.text }}>
        {data.title}
      </motion.div>

      <motion.div
        variants={item}
        style={{ position: "relative", height: "min(520px, 58vh)", borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, background: "#0b0f16", overflow: "hidden" }}
      >
        {failed ? (
          <pre style={{ color: c.bad, fontSize: 12, margin: 0, padding: 16 }}>diagram failed to render</pre>
        ) : (
          <TransformWrapper minScale={0.4} maxScale={6} centerOnInit wheel={{ step: 0.12 }} doubleClick={{ mode: "zoomIn" }}>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2, display: "flex", gap: 4 }}>
                  <ZoomBtn label="−" onClick={() => zoomOut()} />
                  <ZoomBtn label="⤢" onClick={() => resetTransform()} />
                  <ZoomBtn label="+" onClick={() => zoomIn()} />
                </div>
                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%" }}>
                  {/* biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid SVG, securityLevel:strict sanitizes */}
                  <div style={{ width: "100%", padding: 18, boxSizing: "border-box" }} dangerouslySetInnerHTML={{ __html: svg }} />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}
      </motion.div>

      <motion.div variants={item} style={{ padding: "12px 20px", background: c.panel, fontSize: 13, color: c.text }}>
        <span style={{ color: c.muted }}>📋 </span>
        {data.caption}
      </motion.div>
    </motion.div>
  );
}

//! GraphNode[] → React Flow { nodes, edges }, REFINED for a non-engineer glance.
//!
//! Group commits by the code AREA they touched (from `git --stat`), one column per
//! area. Each commit's raw conventional-commit message is REFINED: parse the type
//! (feat/fix/docs/…) → an ICON + color, strip the jargon prefix, show only the human
//! subject. Each area header is a visual summary (type breakdown chips). No LLM.

import type { GraphNode } from "@ddalkkak/shared";
import type { Node as RFNode, Edge as RFEdge } from "@xyflow/react";

// conventional-commit type → glanceable meaning
const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  feat: { icon: "✨", color: "#22c55e", label: "New" },
  fix: { icon: "🐛", color: "#f87171", label: "Fix" },
  docs: { icon: "📝", color: "#58a6ff", label: "Docs" },
  logs: { icon: "🪵", color: "#22d3ee", label: "Log" },
  chore: { icon: "🧹", color: "#94a3b8", label: "Chore" },
  refactor: { icon: "♻️", color: "#a78bfa", label: "Refactor" },
  test: { icon: "✅", color: "#34d399", label: "Test" },
  style: { icon: "🎨", color: "#f59e0b", label: "Style" },
  perf: { icon: "⚡", color: "#eab308", label: "Perf" },
  build: { icon: "📦", color: "#64748b", label: "Build" },
  ci: { icon: "🔁", color: "#64748b", label: "CI" },
};
const FALLBACK = { icon: "•", color: "#94a3b8", label: "Change" };

interface Parsed {
  type: string;
  scope: string;
  subject: string;
  icon: string;
  color: string;
}

/** Parse a conventional-commit subject into icon + plain subject (strip jargon). */
function parseCommit(title: string): Parsed {
  const m = title.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/);
  if (m) {
    const type = m[1].toLowerCase();
    const meta = TYPE_META[type] ?? FALLBACK;
    // also drop a trailing " [no-log]" tag and an em-dash tail's noise → keep it human
    const subject = m[3].replace(/\s*\[(no-log|skip-log)\]\s*$/i, "").trim();
    return { type, scope: m[2] ?? "", subject, icon: meta.icon, color: meta.color };
  }
  return { type: "", scope: "", subject: title, icon: FALLBACK.icon, color: FALLBACK.color };
}

/** Files a commit touched, parsed from its `git show --stat` body. */
function filesOf(node: GraphNode): string[] {
  const out: string[] = [];
  for (const line of (node.body ?? "").split("\n")) {
    const mm = line.match(/^\s*(.+?)\s+\|\s+\d/);
    if (mm) out.push(mm[1].trim());
  }
  return out;
}

/** Coarse code area for a path (monorepo-aware: apps/X, packages/X, else top dir). */
function areaForFile(f: string): string {
  const parts = f.split("/").filter(Boolean);
  if ((parts[0] === "apps" || parts[0] === "packages") && parts.length > 1) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0] || "root";
}

function areaOf(files: string[]): string {
  if (files.length === 0) return "misc";
  const counts = new Map<string, number>();
  for (const f of files) {
    const a = areaForFile(f);
    counts.set(a, (counts.get(a) ?? 0) + 1);
  }
  let best = "misc";
  let n = 0;
  for (const [a, c] of counts) {
    if (c > n) {
      best = a;
      n = c;
    }
  }
  return best;
}

/** Visual type-breakdown chips for an area, e.g. "✨2  🐛3  📝1". */
function breakdown(commits: GraphNode[]): string {
  const counts = new Map<string, number>();
  for (const c of commits) {
    const t = parseCommit(c.title).type || "other";
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${TYPE_META[t]?.icon ?? "•"}${n}`)
    .join("  ");
}

export interface DepgraphView {
  nodes: RFNode[];
  edges: RFEdge[];
}

const COL = 330;
const ROW = 60;

export function toDepgraph(graphNodes: GraphNode[]): DepgraphView {
  const commits = graphNodes.filter((n) => n.node_type === "change");
  const areaCommits = new Map<string, GraphNode[]>();
  for (const c of commits) {
    const area = areaOf(filesOf(c));
    const arr = areaCommits.get(area) ?? [];
    arr.push(c);
    areaCommits.set(area, arr);
  }
  const order = [...areaCommits.keys()].sort(
    (a, b) => (areaCommits.get(b)?.length ?? 0) - (areaCommits.get(a)?.length ?? 0),
  );

  const nodes: RFNode[] = [];
  const edges: RFEdge[] = [];

  order.forEach((area, col) => {
    const x = col * COL;
    const cs = (areaCommits.get(area) ?? [])
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const areaId = `area:${area}`;

    nodes.push({
      id: areaId,
      position: { x, y: 0 },
      data: { label: `📦 ${area}\n${cs.length} changes\n${breakdown(cs)}` },
      style: {
        background: "#0d2440",
        color: "#cbe3ff",
        border: "2px solid #58a6ff",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        width: 300,
        padding: "10px 12px",
        textAlign: "left" as const,
        whiteSpace: "pre-line" as const,
        lineHeight: "1.5",
      },
    });

    cs.forEach((c, row) => {
      const p = parseCommit(c.title);
      nodes.push({
        id: c.node_id,
        position: { x: x + 14, y: (row + 1) * ROW + 56 },
        data: { label: `${p.icon}  ${p.subject}` },
        style: {
          background: "#161b22",
          color: "#e6edf3",
          border: "1px solid #30363d",
          borderLeft: `4px solid ${p.color}`,
          borderRadius: 8,
          fontSize: 11.5,
          width: 272,
          padding: "6px 10px",
          textAlign: "left" as const,
        },
      });
      edges.push({
        id: `${c.node_id}__touches__${areaId}`,
        source: c.node_id,
        target: areaId,
        style: { stroke: "#2a3a52" },
      });
    });
  });

  return { nodes, edges };
}

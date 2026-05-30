//! "Activity" — the REAL captured commits, rendered through the pretty `recap`
//! renderer, grouped into a section per startup. This is the "real + pretty" merge:
//! your actual data wearing the nice card. Per-startup sectioning is the stepping
//! stone to per-session (add session_id to the grouping when the augmentor wires up).

import { useMemo } from "react";
import type { GraphNode } from "@ddalkkak/shared";
import { useT } from "../i18n";
import { changeNodeToRecap } from "./nodeToRecap";
import { RecapCard } from "./RecapCard";
import { c } from "./tokens";

interface Props {
  nodes: GraphNode[];
  startups: { id: string; name: string; emoji: string }[];
  emptyHint: string;
}

const PER_STARTUP = 6;

export function ActivityView({ nodes, startups, emptyHint }: Props) {
  const { t } = useT();

  const groups = useMemo(() => {
    const byStartup = new Map<string, GraphNode[]>();
    for (const n of nodes) {
      if (n.node_type !== "change") continue;
      const arr = byStartup.get(n.startup_id) ?? [];
      arr.push(n);
      byStartup.set(n.startup_id, arr);
    }
    return [...byStartup.entries()].map(([id, ns]) => ({
      id,
      meta: startups.find((s) => s.id === id),
      nodes: ns.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    }));
  }, [nodes, startups]);

  if (groups.length === 0) {
    return <p style={{ opacity: 0.7, lineHeight: 1.6 }}>{emptyHint}</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {groups.map((g) => (
        <section key={g.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: c.text }}>
            <span style={{ fontSize: 18 }}>{g.meta?.emoji ?? "•"}</span>
            <span>{g.meta?.name ?? g.id}</span>
            <span style={{ fontSize: 12, color: c.dim, fontWeight: 400 }}>
              {g.nodes.length} {t("activity.changes")}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 14 }}>
            {g.nodes.slice(0, PER_STARTUP).map((n) => (
              <RecapCard key={n.node_id} data={changeNodeToRecap(n)} />
            ))}
          </div>
          {g.nodes.length > PER_STARTUP && (
            <span style={{ fontSize: 11, color: c.dim }}>
              +{g.nodes.length - PER_STARTUP} {t("activity.more")}
            </span>
          )}
        </section>
      ))}
    </div>
  );
}

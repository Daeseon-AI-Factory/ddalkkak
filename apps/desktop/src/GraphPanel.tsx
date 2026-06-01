//! The connective-layer read surface (v0): a cross-startup list of graph nodes
//! with a provenance badge. Deliberately dumb — its job is to prove
//! capture → store → read end-to-end. See docs/CONNECTIVE_LAYER.md.

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GraphNode } from "@ddalkkak/shared";
import { ActivityView } from "./viz/ActivityView";
import { VizDemo } from "./viz/VizDemo";
import { PulsePanel } from "./viz/PulsePanel";
import { useT } from "./i18n";

interface Props {
  startups: { id: string; name: string; emoji: string }[];
  onClose: () => void;
}

const PROV_COLOR: Record<string, string> = {
  confirmed: "#22c55e",
  inferred: "#f59e0b",
  hypothesis: "#94a3b8",
};

export function GraphPanel({ startups, onClose }: Props) {
  const { t } = useT();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"graph" | "list" | "demo" | "pulse">("graph");

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await invoke<GraphNode[]>("graph_list");
      list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)); // newest first
      setNodes(list);
    } catch (e) {
      console.error("graph_list failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const emojiFor = (startupId: string) =>
    startups.find((s) => s.id === startupId)?.emoji ?? "•";

  return (
    // biome-ignore lint/a11y: v0 panel; click-backdrop-to-close is intentional
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1500px, 96vw)",
          height: "92vh",
          maxHeight: "92vh",
          overflow: "auto",
          background: "#0f172a",
          color: "#e2e8f0",
          border: "1px solid #334155",
          borderRadius: 8,
          padding: 16,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <strong>📊 {t("graph.title")}</strong>
          <span style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setView("graph")} style={{ fontWeight: view === "graph" ? 700 : 400 }}>
              ⚡ {t("graph.activity")}
            </button>
            <button type="button" onClick={() => setView("list")} style={{ fontWeight: view === "list" ? 700 : 400 }}>
              ☰ {t("graph.list")}
            </button>
            <button type="button" onClick={() => setView("demo")} style={{ fontWeight: view === "demo" ? 700 : 400 }}>
              🎨 {t("graph.cards")}
            </button>
            <button type="button" onClick={() => setView("pulse")} style={{ fontWeight: view === "pulse" ? 700 : 400 }}>
              📈 {t("pulse.tab")}
            </button>
            <button type="button" onClick={() => void invoke("capture_now").then(refresh)}>
              {t("graph.captureNow")}
            </button>
            <button type="button" onClick={() => void refresh()}>
              {t("graph.refresh")}
            </button>
            <button type="button" onClick={onClose}>
              ✕
            </button>
          </span>
        </div>

        {view !== "pulse" && (
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>
            {view === "demo" ? t("graph.demoHint") : t("graph.realHint")}
          </div>
        )}

        {view === "pulse" ? (
          <PulsePanel startups={startups} />
        ) : view === "demo" ? (
          <VizDemo />
        ) : loading ? (
          <p>Loading…</p>
        ) : view === "graph" ? (
          <ActivityView nodes={nodes} startups={startups} emptyHint={t("graph.empty")} />
        ) : nodes.length === 0 ? (
          <p style={{ opacity: 0.7, lineHeight: 1.6 }}>
            No nodes yet. Right-click a startup in the sidebar → <b>Grant folder…</b>, make a
            commit in that repo, and it shows up here within ~20s (or hit <b>Capture now</b>).
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {nodes.map((n) => (
              <div
                key={n.node_id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "baseline",
                  padding: "5px 0",
                  borderBottom: "1px solid #1e293b",
                  fontSize: 13,
                }}
              >
                <span title={n.startup_id}>{emojiFor(n.startup_id)}</span>
                <span style={{ opacity: 0.55, minWidth: 58 }}>{n.node_type}</span>
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {n.title}
                </span>
                <span style={{ color: PROV_COLOR[n.provenance] ?? "#94a3b8", fontSize: 11 }}>
                  {n.provenance}
                </span>
                <span style={{ opacity: 0.45, fontSize: 11 }}>
                  {n.created_at?.slice(0, 16).replace("T", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

//! The connective-layer read surface (v0): a cross-startup list of graph nodes
//! with a provenance badge. Deliberately dumb — its job is to prove
//! capture → store → read end-to-end. See docs/CONNECTIVE_LAYER.md.

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GraphNode } from "@ddalkkak/shared";

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
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [loading, setLoading] = useState(true);

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
          width: "min(900px, 90vw)",
          maxHeight: "80vh",
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
          <strong>📊 Connective graph — changes across startups</strong>
          <span style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => void invoke("capture_now").then(refresh)}>
              Capture now
            </button>
            <button type="button" onClick={() => void refresh()}>
              Refresh
            </button>
            <button type="button" onClick={onClose}>
              ✕
            </button>
          </span>
        </div>

        {loading ? (
          <p>Loading…</p>
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

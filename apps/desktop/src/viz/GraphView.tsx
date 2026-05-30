//! Connective-graph viz (v1): the portfolio graph as a React Flow node/edge
//! diagram. Replaces the dumb list — nodes colored by node_type, bordered by
//! provenance, auto-laid-out by topological layer. See nodeToDepgraph.ts.

import { useMemo } from "react";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GraphNode } from "@ddalkkak/shared";
import { toDepgraph } from "./nodeToDepgraph";

export function GraphView({ nodes }: { nodes: GraphNode[] }) {
  const { rfNodes, rfEdges } = useMemo(() => {
    const view = toDepgraph(nodes);
    return { rfNodes: view.nodes, rfEdges: view.edges };
  }, [nodes]);

  if (nodes.length === 0) {
    return (
      <p style={{ opacity: 0.7, lineHeight: 1.6 }}>
        No nodes yet. Right-click a startup → <b>Grant folder…</b>, commit in that repo, and the
        graph fills in within ~20s.
      </p>
    );
  }

  return (
    <div style={{ width: "100%", height: "60vh", minHeight: 360, borderRadius: 8, overflow: "hidden" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        fitView
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        edgesFocusable={false}
      >
        <Background color="#1e293b" gap={20} />
        <MiniMap pannable zoomable style={{ background: "#0f172a" }} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

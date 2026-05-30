//! Captured git commit (a `change` node) → a `recap` payload.
//!
//! STRICTLY factual — the no-distortion rule. We use the real commit subject and the
//! real files + line counts from the stored `git --stat`. We do NOT invent a next_step
//! (git can't know it) and do NOT claim added/edited/deleted (a --stat can't prove
//! which). Provenance on the source node stays `confirmed`; nothing here fabricates.

import type { GraphNode, RecapData } from "@ddalkkak/shared";

/** Parse "path | N" lines from a git --stat body. */
function filesWithLines(body: string): { path: string; lines: number }[] {
  const out: { path: string; lines: number }[] = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*(.+?)\s+\|\s+(\d+)/);
    if (m) out.push({ path: m[1].trim(), lines: Number(m[2]) });
  }
  return out;
}

export function changeNodeToRecap(node: GraphNode): RecapData {
  const changed = filesWithLines(node.body ?? "").map((f) => {
    const parts = f.path.split("/");
    const base = parts.pop() ?? f.path;
    const dir = parts.join("/");
    return { what: base, path: dir || undefined, lines: f.lines };
  });
  return {
    headline: node.title, // the real commit subject, verbatim
    tone: "success", // a landed commit — recorded, not a quality claim
    changed,
    // next_step intentionally omitted — inventing one would distort
  };
}

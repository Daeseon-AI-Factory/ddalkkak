//! The single ingest validator. EVERY write path (git capture today, external
//! PULL or agent PUSH later) must pass a record through `validateNode` before it
//! is stored. This is how "an inferred node can never masquerade as fact" and
//! "no empty/category-error nodes" become MECHANICAL, not aspirational.
//!
//! NOTE: the Rust store mirrors these exact checks in `GraphStore::append`
//! (defense-in-depth). Keep the two in lockstep — see graph.test if added.

import type { GraphNode, NodeType, Provenance } from "./graph";

const NODE_TYPES = new Set<NodeType>([
  "identity",
  "structure",
  "issue",
  "flow",
  "metric",
  "change",
]);
const PROVENANCES = new Set<Provenance>(["confirmed", "inferred", "hypothesis"]);

export type ValidateResult =
  | { ok: true; node: GraphNode }
  | { ok: false; error: string };

export function validateNode(n: unknown): ValidateResult {
  const fail = (error: string): ValidateResult => ({ ok: false, error });

  if (typeof n !== "object" || n === null) return fail("not an object");
  const r = n as Record<string, unknown>;

  if (typeof r.schema_version !== "number") return fail("schema_version missing");
  if (typeof r.node_id !== "string" || !r.node_id) return fail("node_id missing");
  if (typeof r.startup_id !== "string" || !r.startup_id) return fail("startup_id missing");
  if (!NODE_TYPES.has(r.node_type as NodeType)) return fail(`bad node_type: ${String(r.node_type)}`);
  if (!PROVENANCES.has(r.provenance as Provenance)) return fail(`bad provenance: ${String(r.provenance)}`);
  if (typeof r.created_at !== "string") return fail("created_at missing");
  // Kills empty nodes (the old prompt→issue masquerade had no real content).
  if (typeof r.title !== "string" || !r.title.trim()) return fail("empty title");
  // Honesty rule: a confirmed node MUST carry an evidence receipt a reader can re-check.
  if (r.provenance === "confirmed" && (typeof r.evidence !== "object" || r.evidence === null)) {
    return fail("confirmed node lacks evidence");
  }

  return { ok: true, node: n as GraphNode };
}

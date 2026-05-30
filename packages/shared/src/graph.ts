//! Connective-layer graph schema (see docs/CONNECTIVE_LAYER.md, BLUEPRINT.md §5.5).
//!
//! ONE record = ONE graph node. The schema is platform-owned and LOCKED per version.
//! Migration policy (joinability):
//!   1. Additive-only fields — never rename, repurpose, or remove.
//!   2. Readers tolerate unknown fields (forward-compatible).
//!   3. Version-dispatch on READ; never rewrite old records on disk.
//!   4. `node_id` is the eternal, deterministic join key.

export const SCHEMA_VERSION = 1 as const;

/** The five §5.5 connection points + `change` (a committed code change — the v0 source). */
export type NodeType =
  | "identity"
  | "structure"
  | "issue"
  | "flow"
  | "metric"
  | "change";

/** How much we trust the node. An `inferred`/`hypothesis` node must carry a `source`/evidence. */
export type Provenance = "confirmed" | "inferred" | "hypothesis";

export interface GraphEvidence {
  /** Where the fact came from. `git` for v0 capture. */
  source: "git" | "stripe" | "monitor" | "agent";
  /** Granted repo root (for `git` source) — lets a reader re-verify. */
  repo_root?: string;
  /** Commit hash (for `git` source) — `git show <hash>` re-verifies the node. */
  hash?: string;
  /** When the fact occurred in the world (e.g. git commit time) — distinct from `created_at`. */
  occurred_at?: string;
  /** Readers tolerate unknown fields (joinability rule #2). */
  [k: string]: unknown;
}

export interface GraphNode {
  /** = SCHEMA_VERSION at write time; readers dispatch on this. */
  schema_version: number;
  /** Deterministic join key. For a change: `<startupId>/change/<commitHash>`. */
  node_id: string;
  startup_id: string;
  node_type: NodeType;
  provenance: Provenance;
  /** ISO 8601 UTC — when WE ingested this node. */
  created_at: string;
  /** Human-legible one-liner (e.g. a commit subject, truncated). */
  title: string;
  /** Optional human-legible markdown detail (e.g. a `git --stat` block). */
  body?: string;
  /** Provenance receipt. REQUIRED when `provenance === "confirmed"` (see validateNode). */
  evidence?: GraphEvidence;
}

/** Truncate a title to a sane single-line length. */
export function clampTitle(s: string, max = 200): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

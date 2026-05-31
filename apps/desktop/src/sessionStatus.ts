//! Per-session live status, driven by Claude Code HOOK events (see docs/DECISIONS.md
//! ADR-001 — the reliable path, replacing the unreliable TUI scraping).
//!
//! Flow: a hook in the user's Claude config writes one line per event to a file →
//! the Rust watcher (hooks.rs) tails it and emits a `session-hook` Tauri event →
//! App.tsx routes each here via applyHookEvent → React reads it with useSessionStatus.

import { useSyncExternalStore } from "react";
import type { ActivityState } from "@ddalkkak/augmentor";

export interface SessionStatus {
  state: ActivityState;
  lastTool?: string;
  updatedAt: number; // 0 = no event seen yet → the strip stays hidden
  tpath?: string; // latest transcript_path for this pane (for on-demand summarize, ADR-002)
  card?: { kind: string; data: unknown }; // latest in-line self-summary (ADR-003)
}

const DEFAULT: SessionStatus = { state: "idle", updatedAt: 0 };
const statuses = new Map<string, SessionStatus>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Claude Code hook event name → coarse activity state. */
const HOOK_STATE: Record<string, ActivityState> = {
  UserPromptSubmit: "thinking", // user asked something → Claude is on it
  PreToolUse: "tool-call", // running a tool
  PostToolUse: "tool-call", // tool finished, likely more work
  Notification: "blocked", // waiting on the user (permission / input)
  Stop: "completed", // finished the turn → idle/done
};

/** Handle one `session-hook` payload — a raw JSON line `{pane, event, tool, ts}`. */
export function applyHookEvent(raw: string): void {
  let msg: { pane?: string; event?: string; tool?: string; tpath?: string };
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  if (!msg.pane || !msg.event) return;
  const state = HOOK_STATE[msg.event];
  if (!state) return;
  const prev = statuses.get(msg.pane);
  statuses.set(msg.pane, {
    state,
    lastTool: msg.tool || (state === "tool-call" ? prev?.lastTool : undefined),
    updatedAt: Date.now(),
    tpath: msg.tpath || prev?.tpath,
  });
  emit();
}

/** Handle one captured `<dk-summary>` block (raw JSON) — the in-line self-summary (ADR-003). */
export function applyInlineSummary(id: string, rawJson: string): void {
  let payload: { kind?: string; data?: unknown };
  try {
    payload = JSON.parse(rawJson);
  } catch {
    return;
  }
  if (!payload.kind) return;
  const prev = statuses.get(id) ?? DEFAULT;
  statuses.set(id, {
    ...prev,
    card: { kind: payload.kind, data: payload.data },
    updatedAt: Date.now(),
  });
  emit();
}

export function getSessionStatus(id: string): SessionStatus {
  return statuses.get(id) ?? DEFAULT;
}

export function clearSessionStatus(id: string): void {
  if (statuses.delete(id)) emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useSessionStatus(id: string): SessionStatus {
  return useSyncExternalStore(subscribe, () => getSessionStatus(id));
}

//! Per-session live status, derived from the augmentor event stream.
//!
//! The augmentor already runs on every pane's PTY output (terminalRegistry.ts). This
//! is the tiny external store that turns those events into a coarse "what is this
//! session's Claude doing right now" state, subscribable from React via useSessionStatus.
//! Layer 1 of per-session viz — deterministic, no LLM. Layer 2 (rich cards via the BYO
//! LLM) builds on the same event stream.

import { useSyncExternalStore } from "react";
import type { ActivityState, AugmentorEvent } from "@ddalkkak/augmentor";

export interface SessionStatus {
  state: ActivityState;
  lastTool?: string;
  updatedAt: number; // 0 = never emitted an event (e.g. a plain shell, no Claude)
}

const DEFAULT: SessionStatus = { state: "idle", updatedAt: 0 };
const statuses = new Map<string, SessionStatus>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Coarse activity state for an event (fallback by type when state is absent). */
function stateOf(e: AugmentorEvent): ActivityState {
  if (e.state) return e.state;
  switch (e.type) {
    case "tool-call":
      return "tool-call";
    case "prompt":
      return "blocked";
    case "completion":
      return "completed";
    default:
      return "thinking";
  }
}

/** Fold a batch of fresh augmentor events into a session's status. */
export function applyEvents(id: string, events: AugmentorEvent[]): void {
  if (events.length === 0) return;
  const last = events[events.length - 1];
  const prev = statuses.get(id);
  statuses.set(id, {
    state: stateOf(last),
    lastTool: last.tool ?? prev?.lastTool,
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

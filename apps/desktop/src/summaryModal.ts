//! Tiny store for THE one open session-summary popup. Lifting it out of the per-pane
//! status bar lets the modal render once at the app root (a portal centered on the
//! whole window, not trapped/clipped inside a Mosaic tile), and lets the source pane
//! highlight itself (red outline) while its summary is open.

import { useSyncExternalStore } from "react";

export interface UsageTotals {
  input: number;
  output: number;
  cache_read: number;
  cache_creation: number;
  messages: number;
}

/** Token usage split two ways: `turn` = the most recent question (assistant messages since
 *  the last user prompt), `session` = the whole-session lifetime total. */
export interface SessionUsage {
  session: UsageTotals;
  turn: UsageTotals;
}

export interface OpenSummary {
  paneId: string;
  state: "loading" | "error" | "done";
  payload?: { kind: string; data?: unknown };
  usage?: SessionUsage;
  error?: string;
}

let current: OpenSummary | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function setSummary(s: OpenSummary | null): void {
  current = s;
  emit();
}

export function getSummary(): OpenSummary | null {
  return current;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useSummary(): OpenSummary | null {
  return useSyncExternalStore(subscribe, getSummary);
}

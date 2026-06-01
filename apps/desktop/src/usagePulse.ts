//! Usage Pulse (ADR-005) — types + fetch for the cross-startup read-time rollup.
//! All numbers are honest effort/activity (output tokens, counts, active days); never $.

import { invoke } from "@tauri-apps/api/core";

export interface PulseDay {
  day: string;
  output: number;
  turns: number;
  commits: number;
  blocks: number;
  active: boolean;
}

export interface PulseStartup {
  startup_id: string;
  output_week: number;
  active_days_14: number;
  days_since_active: number | null;
  steps_recent: number;
  steps_baseline: number;
  tool_explore: number;
  tool_produce: number;
  tool_other: number;
  blocks_week: number;
  tool_errors_week: number;
  turns_week: number;
  commits_week: number;
  daily: PulseDay[];
}

export interface Pulse {
  generated_day: string;
  block_history_since: string | null;
  startups: PulseStartup[];
}

export function fetchPulse(): Promise<Pulse> {
  return invoke<Pulse>("usage_pulse");
}

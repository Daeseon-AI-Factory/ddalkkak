//! Module-level registry for xterm.js terminals + PTY subscriptions.
//!
//! Lives OUTSIDE React component lifecycle so that Mosaic-induced remounts
//! (caused by layout path changes on split/stack/reset) do NOT destroy
//! the underlying terminal, PTY child process, or event subscription.
//!
//! See docs/ISSUES.md 2026-05-26 entries for the chain of failures that
//! led here. Pattern: VS Code Server's terminal hosting.

import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { StreamParser } from "@ddalkkak/augmentor";
import { applyInlineSummary, clearSessionStatus } from "./sessionStatus";
import { SummaryStripper } from "./summaryStripper";

interface PtyOutputEvent {
  id: string;
  data: string;
}

interface RegistryEntry {
  term: Terminal;
  fit: FitAddon;
  unlisten: UnlistenFn | null;
  spawned: boolean;
  parser: StreamParser;
  stripper: SummaryStripper;
}

const registry = new Map<string, RegistryEntry>();

/**
 * Get the terminal + fit addon for a pane id. Creates on first call,
 * reuses on subsequent calls (e.g. after a Mosaic split causes remount).
 * Caller is responsible for attaching `term.element` to the DOM.
 */
export function getOrCreateTerminal(id: string): RegistryEntry {
  const existing = registry.get(id);
  if (existing) return existing;

  const term = new Terminal({
    cursorBlink: true,
    // "Apple SD Gothic Neo" (always present on macOS) is a CJK fallback so Hangul
    // renders as real glyphs (not tofu/boxes) once the UTF-8 locale fix lets the
    // bytes through. ASCII still uses Menlo first. See pty.rs RULE #5b note + ISSUES.
    fontFamily: 'Menlo, "JetBrains Mono", "SF Mono", "Apple SD Gothic Neo", monospace',
    fontSize: 13,
    theme: { background: "#0f172a", foreground: "#e2e8f0" },
    scrollback: 10000,
  });
  const fit = new FitAddon();
  term.loadAddon(fit);

  const parser = new StreamParser();
  const stripper = new SummaryStripper();
  const entry: RegistryEntry = { term, fit, unlisten: null, spawned: false, parser, stripper };
  registry.set(id, entry);

  // Subscribe to PTY output for this id, once. The subscription survives
  // component remounts because it's module-scoped, not effect-scoped.
  void (async () => {
    const off = await listen<PtyOutputEvent>("pty-output", (event) => {
      if (event.payload.id === id) {
        // ADR-003: pull the pane Claude's <dk-summary> blocks OUT of the stream so the
        // user never sees them; each becomes that session's card. We write the STRIPPED
        // text to xterm. On any error, fall back to the raw data (never drop output).
        let display = event.payload.data;
        try {
          const out = stripper.feed(event.payload.data);
          display = out.display;
          for (const json of out.summaries) applyInlineSummary(id, json);
          // Augmentor parses the visible text for the dev-time event log; per-session
          // STATUS comes from Claude Code hooks (sessionStatus.ts / hooks.rs). See ADR-001.
          const evts = parser.feed(display);
          for (const evt of evts) {
            void invoke("log_augmentor_event", { id, event: evt as unknown as Record<string, unknown> }).catch(() => {});
            if (import.meta.env?.DEV) console.debug(`[augmentor ${id}]`, evt);
          }
        } catch (e) {
          console.warn("stream filter/augmentor threw:", e);
        }
        term.write(display);
      }
    });
    entry.unlisten = off;
  })();

  // Forward typed input to the PTY, once.
  term.onData((data) => {
    void invoke("pty_write", { id, input: data });
  });

  return entry;
}

/** Idempotent — spawns the PTY for `id` on first call, no-ops afterward. */
export async function ensureSpawned(id: string, cols: number, rows: number) {
  const entry = registry.get(id);
  if (!entry || entry.spawned) return;
  entry.spawned = true; // set before await to avoid double-spawn race
  try {
    await invoke("pty_spawn", { id, cols, rows });
  } catch (e) {
    entry.spawned = false;
    console.error(`pty_spawn failed for ${id}:`, e);
  }
}

/**
 * Permanently destroy a pane: kill PTY, dispose xterm, unsubscribe, evict.
 * Call from an EXPLICIT user action (Close button, Reset toolbar).
 * NEVER call this from useEffect cleanup — that fires on Mosaic remount
 * and must NOT destroy.
 */
export async function destroyTerminal(id: string): Promise<void> {
  const entry = registry.get(id);
  if (!entry) return;
  if (entry.unlisten) entry.unlisten();
  try {
    await invoke("pty_kill", { id });
  } catch {
    // best-effort
  }
  entry.term.dispose();
  registry.delete(id);
  clearSessionStatus(id);
}

export function listTerminals(): string[] {
  return Array.from(registry.keys());
}

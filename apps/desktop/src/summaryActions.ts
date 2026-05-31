//! Shared "open the ✨ summary popup for a pane" action — used by BOTH the per-pane
//! ✨ button (SessionStatusBar) and the ⌘I keyboard shortcut (App). Reads the pane's
//! latest transcript_path from the hook-driven status store, fetches token usage + the
//! in-line summary card (ADR-004) in parallel, and pushes the result into the summary store.

import { invoke } from "@tauri-apps/api/core";
import { getSessionStatus } from "./sessionStatus";
import { type SessionUsage, setSummary } from "./summaryModal";

export async function openSummaryFor(paneId: string, noTranscriptMsg: string): Promise<void> {
  const tpath = getSessionStatus(paneId).tpath;
  if (!tpath) {
    setSummary({ paneId, state: "error", error: noTranscriptMsg });
    return;
  }
  setSummary({ paneId, state: "loading" });
  // Usage first, tolerant of the card not existing yet (a session can have tokens but no
  // <dk-summary> block); the card read failing still shows the usage line.
  const usage = await invoke<SessionUsage>("session_usage", { transcriptPath: tpath }).catch(
    () => undefined,
  );
  try {
    const payload = await invoke<{ kind: string; data: unknown }>("read_inline_summary", {
      transcriptPath: tpath,
    });
    setSummary({ paneId, state: "done", payload, usage });
  } catch (e) {
    setSummary({ paneId, state: usage ? "done" : "error", usage, error: String(e) });
  }
}

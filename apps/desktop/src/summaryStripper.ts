//! Strips `<dk-summary>{json}</dk-summary>` blocks out of a pane's PTY stream (ADR-003)
//! so the user never sees them, returning the display text + any complete summary JSON.
//!
//! Stateful + cross-chunk safe: when a chunk ends mid-marker, only the *possible partial
//! marker* is held back (never real terminal output), and re-evaluated on the next chunk.

const OPEN = "<dk-summary>";
const CLOSE = "</dk-summary>";

/** Longest suffix of `s` that is a prefix of `marker` (a marker possibly split across chunks). */
function partialTail(s: string, marker: string): number {
  const max = Math.min(s.length, marker.length - 1);
  for (let k = max; k > 0; k--) {
    if (s.endsWith(marker.slice(0, k))) return k;
  }
  return 0;
}

export class SummaryStripper {
  private capturing = false;
  private captureBuf = "";
  private hold = ""; // trailing bytes that might be the start of OPEN/CLOSE across chunks

  /** Feed a chunk → { display: text to write to xterm, summaries: complete JSON strings }. */
  feed(chunk: string): { display: string; summaries: string[] } {
    let work = this.hold + chunk;
    this.hold = "";
    let display = "";
    const summaries: string[] = [];

    for (;;) {
      if (!this.capturing) {
        const i = work.indexOf(OPEN);
        if (i === -1) {
          const keep = partialTail(work, OPEN);
          display += work.slice(0, work.length - keep);
          this.hold = work.slice(work.length - keep);
          break;
        }
        display += work.slice(0, i);
        work = work.slice(i + OPEN.length);
        this.capturing = true;
        this.captureBuf = "";
      } else {
        const j = work.indexOf(CLOSE);
        if (j === -1) {
          const keep = partialTail(work, CLOSE);
          this.captureBuf += work.slice(0, work.length - keep);
          this.hold = work.slice(work.length - keep);
          break;
        }
        this.captureBuf += work.slice(0, j);
        const json = this.captureBuf.trim();
        if (json) summaries.push(json);
        this.captureBuf = "";
        work = work.slice(j + CLOSE.length);
        this.capturing = false;
      }
    }
    return { display, summaries };
  }
}

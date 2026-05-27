//! Claude Code stream parser — Phase 2.1 prototype.
//!
//! Consumes raw PTY output (chunks of bytes, potentially split mid-line),
//! recognizes structured "events" describing what Claude Code is doing
//! (tool calls, prompts, activity hints, completions).
//!
//! Heuristic line-based matching against observed Claude Code output
//! patterns. Patterns will be refined as we collect real transcripts
//! during Phase 1.5 dogfood. See logs at
//!   ~/Library/Logs/DalkkakAI/runtime.log.YYYY-MM-DD
//! filtered by `target=augmentor` for the live event stream.

export type ActivityState =
  | "idle"
  | "thinking"
  | "tool-call"
  | "blocked"
  | "completed";

export type EventType = "activity" | "tool-call" | "prompt" | "completion";

export interface AugmentorEvent {
  ts: string; // ISO timestamp
  type: EventType;
  state?: ActivityState;
  tool?: string;
  matched_line?: string;
}

// ANSI escape sequences (CSI, OSC, single ESC) — strip before pattern matching.
const ANSI_REGEX =
  /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*(\x07|\x1b\\)|\x1b[@-Z\\-_]/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI_REGEX, "");
}

export class StreamParser {
  // Holds the trailing partial line (chunks may arrive mid-line).
  private buffer = "";

  /** Feed a raw output chunk. Returns 0+ events recognized. */
  feed(chunk: string): AugmentorEvent[] {
    this.buffer += chunk;
    const out: AugmentorEvent[] = [];

    let nl: number;
    while ((nl = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, nl);
      this.buffer = this.buffer.slice(nl + 1);
      const evt = this.parseLine(line);
      if (evt) out.push(evt);
    }
    return out;
  }

  /** Force-flush the buffer (treat it as a complete line). Useful in tests. */
  flush(): AugmentorEvent[] {
    if (!this.buffer) return [];
    const evt = this.parseLine(this.buffer);
    this.buffer = "";
    return evt ? [evt] : [];
  }

  reset(): void {
    this.buffer = "";
  }

  private parseLine(rawLine: string): AugmentorEvent | null {
    const line = stripAnsi(rawLine).trim();
    if (!line) return null;
    const ts = new Date().toISOString();

    // 1. Claude Code tool call announcement.
    //    Observed: "⏺ Bash(...)", "● Edit(file)", "▶ Read(...)"
    //    Heuristic: leading marker char + CamelCase tool + "(" args
    const tc = line.match(/^[●⏺•▸▶◆]\s*([A-Z][A-Za-z]+)\s*\(/);
    if (tc) {
      return {
        ts,
        type: "tool-call",
        tool: tc[1],
        state: "tool-call",
        matched_line: line.slice(0, 200),
      };
    }

    // 2. "Do you want to..." / approval prompt
    if (
      /^(Do you want|Approve|Confirm\??|Proceed\??|Continue\??|Allow\??)/i.test(
        line,
      )
    ) {
      return {
        ts,
        type: "prompt",
        state: "blocked",
        matched_line: line.slice(0, 200),
      };
    }

    // 3. Working / activity indicator
    if (
      /^(Thinking|Working|Processing|Analyzing|Reading|Searching|Planning)/i.test(
        line,
      )
    ) {
      return {
        ts,
        type: "activity",
        state: "thinking",
        matched_line: line.slice(0, 200),
      };
    }

    // 4. Completion signals
    if (
      /^(Done|Completed|Finished|Successfully|✓|✅)/i.test(line) &&
      line.length < 120 // long lines starting with "Done" are usually prose
    ) {
      return {
        ts,
        type: "completion",
        state: "completed",
        matched_line: line.slice(0, 200),
      };
    }

    return null;
  }
}

/** Convenience: parse a whole transcript string at once. Useful for tests. */
export function parseTranscript(s: string): AugmentorEvent[] {
  const p = new StreamParser();
  return [...p.feed(s), ...p.flush()];
}

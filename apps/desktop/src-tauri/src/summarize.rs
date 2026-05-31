//! Layer 2 — on-demand session summary via the user's own `claude -p` (ADR-002).
//!
//! Reads the tail of a session's transcript and asks the user's Claude Code (headless)
//! to emit ONE locked viz payload (recap / plan). True BYO: their Claude, their auth,
//! cost only when the user clicks "✨". The summarising `claude -p` is NOT in a tagged
//! tmux pane, so `DALKKAK_PANE_ID` is unset → our own hooks no-op on it (no event noise).

use std::path::Path;
use std::time::Duration;
use tokio::process::Command;
use tracing::{info, warn};

/// The DalkkakAI session-summarizer prompt — a maintained STANDARD designed via the
/// `summarizer-prompt-design` workflow (3 drafts → synthesised). Picks the best viz_kind
/// (question > concept > plan > recap > note), matches the session's language, never
/// invents. Edit the file, not this line.
const PROMPT_HEADER: &str = include_str!("../prompts/session_summary.md");

/// PATH augmented so `claude` (and anything it shells out to) resolves inside the
/// minimal Finder-launched GUI app environment. The Claude Code CLI commonly lives in
/// `~/.local/bin`, NOT Homebrew — so prepend that too (RULE #5b).
fn augmented_path() -> String {
    let home = std::env::var("HOME").unwrap_or_default();
    let extra = format!("{home}/.local/bin:/opt/homebrew/bin:/usr/local/bin");
    match std::env::var("PATH") {
        Ok(p) => format!("{extra}:{p}"),
        Err(_) => format!("{extra}:/usr/bin:/bin"),
    }
}

/// Resolve the `claude` binary robustly (the GUI app's inherited PATH may not include it).
fn find_claude() -> String {
    let home = std::env::var("HOME").unwrap_or_default();
    for c in [
        format!("{home}/.local/bin/claude"),
        "/opt/homebrew/bin/claude".to_string(),
        "/usr/local/bin/claude".to_string(),
        format!("{home}/.claude/local/claude"),
    ] {
        if Path::new(&c).exists() {
            return c;
        }
    }
    "claude".to_string() // last resort: rely on PATH
}

/// Last `max_chars` characters of a file (char-boundary safe).
fn read_tail(path: &str, max_chars: usize) -> String {
    let content = std::fs::read_to_string(path).unwrap_or_default();
    let chars: Vec<char> = content.chars().collect();
    let start = chars.len().saturating_sub(max_chars);
    chars[start..].iter().collect()
}

fn strip_fence(s: &str) -> String {
    let t = s.trim();
    let t = t.strip_prefix("```json").or_else(|| t.strip_prefix("```")).unwrap_or(t);
    let t = t.strip_suffix("```").unwrap_or(t);
    t.trim().to_string()
}

/// Sum token usage across all assistant messages in a session transcript. Numbers are
/// REAL (recorded per message by Claude Code); there's no cost field, and on a subscription
/// there's no per-token bill, so we report tokens, not dollars (no fabricated $).
pub fn session_usage(transcript_path: String) -> Result<serde_json::Value, String> {
    if transcript_path.is_empty() || !Path::new(&transcript_path).exists() {
        return Err("no transcript for this session yet".into());
    }
    let content = std::fs::read_to_string(&transcript_path).map_err(|e| e.to_string())?;
    let (mut input, mut output, mut cache_read, mut cache_creation, mut messages) =
        (0u64, 0u64, 0u64, 0u64, 0u64);
    for line in content.lines() {
        let Ok(v) = serde_json::from_str::<serde_json::Value>(line) else {
            continue;
        };
        if v.get("type").and_then(|t| t.as_str()) != Some("assistant") {
            continue;
        }
        let Some(u) = v.get("message").and_then(|m| m.get("usage")) else {
            continue;
        };
        let g = |k: &str| u.get(k).and_then(|x| x.as_u64()).unwrap_or(0);
        input += g("input_tokens");
        output += g("output_tokens");
        cache_read += g("cache_read_input_tokens");
        cache_creation += g("cache_creation_input_tokens");
        messages += 1;
    }
    Ok(serde_json::json!({
        "input": input,
        "output": output,
        "cache_read": cache_read,
        "cache_creation": cache_creation,
        "messages": messages,
    }))
}

/// Extract the JSON inside the LAST `<dk-summary>…</dk-summary>` in a text block.
fn extract_block(text: &str) -> Option<String> {
    let start = text.rfind("<dk-summary>")? + "<dk-summary>".len();
    let after = &text[start..];
    let end = after.find("</dk-summary>")?;
    Some(after[..end].trim().to_string())
}

/// Read the latest in-line self-summary from the session TRANSCRIPT (ADR-003/004): the
/// model emits a clean `<dk-summary>{viz}</dk-summary>` into each reply, which lands in the
/// transcript JSONL un-mangled (unlike the TUI byte stream). We parse the transcript from
/// the end, find the last assistant text block carrying a block, and return its `{kind,data}`.
/// Reliable + instant (a file read, no model call).
pub fn read_inline_summary(transcript_path: String) -> Result<serde_json::Value, String> {
    if transcript_path.is_empty() || !Path::new(&transcript_path).exists() {
        return Err("no transcript for this session yet — give Claude a turn first".into());
    }
    let content = std::fs::read_to_string(&transcript_path).map_err(|e| e.to_string())?;
    for line in content.lines().rev() {
        let Ok(v) = serde_json::from_str::<serde_json::Value>(line) else {
            continue;
        };
        if v.get("type").and_then(|t| t.as_str()) != Some("assistant") {
            continue;
        }
        let Some(blocks) = v
            .get("message")
            .and_then(|m| m.get("content"))
            .and_then(|c| c.as_array())
        else {
            continue;
        };
        for blk in blocks.iter().rev() {
            if blk.get("type").and_then(|t| t.as_str()) != Some("text") {
                continue;
            }
            if let Some(text) = blk.get("text").and_then(|t| t.as_str()) {
                if let Some(json) = extract_block(text) {
                    return serde_json::from_str(&json)
                        .map_err(|e| format!("summary block isn't valid JSON: {e}"));
                }
            }
        }
    }
    Err("no summary yet — give this session a turn (it appears after Claude replies)".into())
}

/// Run the user's `claude -p` on the transcript tail → a `{kind, data}` viz payload.
pub async fn summarize(transcript_path: String) -> Result<serde_json::Value, String> {
    if transcript_path.is_empty() || !Path::new(&transcript_path).exists() {
        return Err("no transcript for this session yet — give Claude a turn first".into());
    }
    let tail = read_tail(&transcript_path, 12000);
    if tail.trim().is_empty() {
        return Err("transcript is empty".into());
    }
    let prompt = format!("{PROMPT_HEADER}\n\nTRANSCRIPT:\n{tail}");
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());

    let claude_bin = find_claude();
    info!(target: "summarize", chars = tail.len(), bin = %claude_bin, "running claude -p");
    let fut = Command::new(&claude_bin)
        // haiku: a summary doesn't need Opus — far cheaper/faster (ADR-002 cost note).
        // --strict-mcp-config with no --mcp-config = load NO MCP servers → skips the
        // ~30s cold-start (the user's claude.ai/Gmail/Drive MCPs) the GUI app was paying.
        .args([
            "-p",
            &prompt,
            "--output-format",
            "json",
            "--model",
            "claude-haiku-4-5",
            "--strict-mcp-config",
        ])
        .env("PATH", augmented_path())
        // use the user's Claude subscription, not a stray/invalid ANTHROPIC_API_KEY in the env
        .env_remove("ANTHROPIC_API_KEY")
        .env_remove("ANTHROPIC_AUTH_TOKEN")
        .current_dir(&home) // neutral cwd → no project CLAUDE.md pulled in
        .output();

    let out = match tokio::time::timeout(Duration::from_secs(90), fut).await {
        Ok(Ok(o)) => o,
        Ok(Err(e)) => return Err(format!("could not run claude ({e}). Is Claude Code installed + on PATH?")),
        Err(_) => return Err("claude -p timed out (90s)".into()),
    };
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr);
        warn!(target: "summarize", status = ?out.status, "claude -p failed");
        return Err(format!("claude -p failed: {}", err.chars().take(300).collect::<String>()));
    }

    // --output-format json gives an envelope; the assistant text is in `.result`.
    let envelope: serde_json::Value = serde_json::from_slice(&out.stdout)
        .map_err(|e| format!("claude returned non-JSON envelope: {e}"))?;
    // claude -p exits 0 even on auth/runtime errors; the envelope flags them.
    if envelope.get("is_error").and_then(|v| v.as_bool()).unwrap_or(false) {
        let msg = envelope.get("result").and_then(|v| v.as_str()).unwrap_or("unknown error");
        return Err(format!("claude error: {msg}"));
    }
    let result = envelope.get("result").and_then(|v| v.as_str()).unwrap_or_default();
    let cleaned = strip_fence(result);
    let payload: serde_json::Value = serde_json::from_str(&cleaned).map_err(|e| {
        format!(
            "model did not return a valid viz payload: {e}; got: {}",
            cleaned.chars().take(200).collect::<String>()
        )
    })?;
    info!(target: "summarize", kind = ?payload.get("kind"), "summary ready");
    Ok(payload)
}

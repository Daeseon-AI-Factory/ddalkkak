//! Per-session status via Claude Code hooks (the reliable path — see docs/DECISIONS.md
//! ADR-001). A hook installed in the user's Claude config appends one JSON line per
//! event to `<data_dir>/DalkkakAI/session-events.jsonl`, stamped with the pane id
//! (`DALKKAK_PANE_ID`, injected per-tmux-session in pty.rs). This module tails that file
//! and forwards each new line to the renderer as a `session-hook` event.
//!
//! File-based (not a localhost port): no port conflicts, survives app restarts, and
//! coexists with any pre-existing hooks the user has.

use std::io::{Read, Seek, SeekFrom};
use std::path::PathBuf;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tracing::{info, warn};

/// `<data_dir>/DalkkakAI/session-events.jsonl` — must match the path the hook writes to.
pub fn events_path() -> Option<PathBuf> {
    let dir = dirs::data_dir()?.join("DalkkakAI");
    let _ = std::fs::create_dir_all(&dir);
    Some(dir.join("session-events.jsonl"))
}

/// Spawn a background tail: every ~400ms, read newly-appended complete lines and emit
/// them to the renderer. Starts at the current end-of-file (old events are not replayed).
pub fn spawn_watcher(app: AppHandle) {
    // tauri::async_runtime::spawn (NOT tokio::spawn) — the Tauri setup closure has no
    // entered tokio runtime, so a raw tokio::spawn panics → SIGABRT at launch. Matches
    // capture::spawn_worker. The inner tokio::time::interval still runs on Tauri's tokio.
    tauri::async_runtime::spawn(async move {
        let Some(path) = events_path() else {
            warn!(target: "hooks", "no data dir — session-hook watcher disabled");
            return;
        };
        info!(target: "hooks", path = %path.display(), "tailing session-events");

        // start from the end so a restart doesn't replay history
        let mut offset: u64 = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        let mut interval = tokio::time::interval(Duration::from_millis(400));

        loop {
            interval.tick().await;

            let len = match std::fs::metadata(&path) {
                Ok(m) => m.len(),
                Err(_) => continue, // file not created yet
            };
            if len < offset {
                offset = 0; // truncated / rotated
            }
            if len == offset {
                continue;
            }

            let mut f = match std::fs::File::open(&path) {
                Ok(f) => f,
                Err(_) => continue,
            };
            if f.seek(SeekFrom::Start(offset)).is_err() {
                continue;
            }
            let mut buf = String::new();
            if f.read_to_string(&mut buf).is_err() {
                continue;
            }

            // only consume up to the last complete line; leave any partial tail for next tick
            let consumed = match buf.rfind('\n') {
                Some(i) => i + 1,
                None => continue,
            };
            offset += consumed as u64;

            for line in buf[..consumed].lines() {
                let line = line.trim();
                if line.is_empty() {
                    continue;
                }
                // forward the raw JSON line; the renderer parses + maps to a status
                if app.emit("session-hook", line).is_err() {
                    warn!(target: "hooks", "emit failed — webview gone");
                }
            }
        }
    });
}

//! PTY backend — spawn a tmux-attached shell per pane id, with robust error visibility.
//!
//! Hardening (Steps C+):
//! - find_tmux(): try known absolute paths (homebrew, etc.) before relying on PATH.
//! - PATH augmentation: prepend /opt/homebrew/bin:/usr/local/bin to subprocess PATH.
//! - bash wrapper: any tmux failure surfaces as visible error + fallback shell.
//! - Visible EOF: PTY close emits a [pane closed] marker to the renderer.

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::Mutex;
use tauri::{Emitter, Window};
use tracing::{error, info, warn};

#[derive(Serialize, Clone)]
struct PtyOutputEvent {
    id: String,
    data: String,
}

pub struct PtySession {
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
    child: Mutex<Box<dyn portable_pty::Child + Send + Sync>>,
}

impl PtySession {
    pub fn write(&self, data: &[u8]) -> Result<(), String> {
        let mut w = self.writer.lock().map_err(|e| e.to_string())?;
        w.write_all(data).map_err(|e| e.to_string())?;
        w.flush().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        let m = self.master.lock().map_err(|e| e.to_string())?;
        m.resize(PtySize { cols, rows, pixel_width: 0, pixel_height: 0 })
            .map_err(|e| e.to_string())
    }

    pub fn kill(&self) -> Result<(), String> {
        let mut c = self.child.lock().map_err(|e| e.to_string())?;
        c.kill().map_err(|e| e.to_string())
    }
}

/// Resolve tmux binary path robustly against minimal Tauri GUI app PATH.
fn find_tmux() -> String {
    let candidates = [
        "/opt/homebrew/bin/tmux", // Apple Silicon Homebrew
        "/usr/local/bin/tmux",    // Intel Homebrew
        "/usr/bin/tmux",          // Linux/macOS native
        "/opt/local/bin/tmux",    // MacPorts
    ];
    for path in &candidates {
        if Path::new(path).exists() {
            return path.to_string();
        }
    }
    "tmux".to_string()
}

/// Build augmented PATH so subprocesses can find Homebrew-installed binaries.
fn augmented_path() -> String {
    let extra = "/opt/homebrew/bin:/usr/local/bin";
    match std::env::var("PATH") {
        Ok(p) if p.contains("/opt/homebrew/bin") || p.contains("/usr/local/bin") => p,
        Ok(p) => format!("{}:{}", extra, p),
        Err(_) => format!("{}:/usr/bin:/bin", extra),
    }
}

pub fn spawn(window: Window, id: String, cols: u16, rows: u16) -> Result<PtySession, String> {
    let cols = if cols == 0 { 80 } else { cols };
    let rows = if rows == 0 { 24 } else { rows };

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize { cols, rows, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())?;

    let tmux_path = find_tmux();
    let tmux_session = format!("dalkkak-{}", id);

    // bash wrapper — tmux failures become visible, then fallback shell so user can debug.
    let cmd_str = format!(
        "{tmux} new-session -A -D -s {sess} 2>&1; \
         status=$?; \
         if [ $status -ne 0 ]; then \
           echo ''; \
           echo '⚠️  tmux exited with code '$status'. tmux_path='{tmux}; \
           echo 'Falling back to interactive shell. Try: tmux ls'; \
           echo ''; \
         fi; \
         exec ${{SHELL:-/bin/bash}}",
        tmux = tmux_path,
        sess = tmux_session,
    );

    let mut cmd = CommandBuilder::new("/bin/bash");
    cmd.args(["-c", &cmd_str]);

    // RULE #5b — explicit env hygiene
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.env("PATH", augmented_path());

    for var in [
        "HOME", "USER", "LOGNAME", "LANG", "LC_ALL", "LC_CTYPE",
        "TZ", "SHELL", "PWD", "TMPDIR",
    ] {
        if let Ok(val) = std::env::var(var) {
            cmd.env(var, val);
        }
    }
    if let Ok(home) = std::env::var("HOME") {
        cmd.cwd(home);
    }

    let child = pair.slave.spawn_command(cmd).map_err(|e| {
        error!(target: "pty", id = %id, error = %e, tmux_path = %tmux_path, "spawn failed");
        format!("Failed to spawn /bin/bash wrapper ({}). Is bash available?", e)
    })?;
    info!(target: "pty", id = %id, cols, rows, tmux_path = %tmux_path, session = %tmux_session, "spawned (bash → tmux)");
    drop(pair.slave);

    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;

    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        let mut total_bytes: u64 = 0;
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    warn!(target: "pty", id = %id, total_bytes, "PTY EOF — session closed");
                    let _ = window.emit(
                        "pty-output",
                        PtyOutputEvent {
                            id: id.clone(),
                            data: format!("\r\n\x1b[33m[pane {} closed]\x1b[0m\r\n", id),
                        },
                    );
                    break;
                }
                Ok(n) => {
                    total_bytes += n as u64;
                    let chunk = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let event = PtyOutputEvent { id: id.clone(), data: chunk };
                    if window.emit("pty-output", event).is_err() {
                        warn!(target: "pty", id = %id, total_bytes, "emit failed — webview gone, ending read loop");
                        break;
                    }
                }
                Err(e) => {
                    error!(target: "pty", id = %id, total_bytes, error = %e, "read error");
                    break;
                }
            }
        }
    });

    Ok(PtySession {
        master: Mutex::new(pair.master),
        writer: Mutex::new(writer),
        child: Mutex::new(child),
    })
}

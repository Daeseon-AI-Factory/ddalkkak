//! PTY backend — spawn a **tmux**-attached shell per pane id.
//!
//! Each pane attaches to a tmux session named `dalkkak-<id>`. If the session
//! exists, the PTY attaches; otherwise tmux creates it. This makes the
//! pane's underlying shell + processes (e.g. `claude` CLI) survive React
//! unmount/remount caused by react-mosaic layout changes.
//!
//! Uses `portable-pty` (Warp, WezTerm) for cross-platform PTY.

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{Emitter, Window};

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

pub fn spawn(window: Window, id: String, cols: u16, rows: u16) -> Result<PtySession, String> {
    let cols = if cols == 0 { 80 } else { cols };
    let rows = if rows == 0 { 24 } else { rows };

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize { cols, rows, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())?;

    // Spawn tmux: attach to id-named session if exists, create otherwise.
    //   -A : attach-if-exists
    //   -D : detach other clients (so a fresh PTY attaches cleanly)
    //   -s : session name
    let tmux_session = format!("dalkkak-{}", id);
    let mut cmd = CommandBuilder::new("tmux");
    cmd.args(["new-session", "-A", "-D", "-s", &tmux_session]);

    // RULE #5b — explicit env hygiene (the client terminal Tauri provides)
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    for var in [
        "PATH", "HOME", "USER", "LOGNAME", "LANG", "LC_ALL", "LC_CTYPE",
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
        format!(
            "Failed to spawn tmux ({}). Is tmux installed? Install: brew install tmux",
            e
        )
    })?;
    drop(pair.slave);

    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;

    // Background read loop — emit "pty-output" with { id, data }.
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let event = PtyOutputEvent { id: id.clone(), data: chunk };
                    if window.emit("pty-output", event).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });

    Ok(PtySession {
        master: Mutex::new(pair.master),
        writer: Mutex::new(writer),
        child: Mutex::new(child),
    })
}

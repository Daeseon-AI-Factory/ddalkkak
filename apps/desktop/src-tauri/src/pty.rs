//! PTY backend — spawn a shell, stream stdout to the webview, accept input.
//!
//! Uses `portable-pty` (same crate as Warp, WezTerm) for cross-platform PTY.

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{Emitter, Window};

/// Holds the live PTY for the current pane.
/// `master` is kept so we can resize; `writer` is the dedicated stdin handle;
/// `child` is the spawned shell process (so we can kill it).
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

/// Spawn a shell PTY. stdout is streamed to the renderer via `pty-output` event.
pub fn spawn(window: Window, cols: u16, rows: u16) -> Result<PtySession, String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize { cols, rows, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())?;

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
    let cmd = CommandBuilder::new(shell);
    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    // slave is no longer needed after spawn; drop releases the fd
    drop(pair.slave);

    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;

    // Background read loop: PTY stdout -> tauri event
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buf[..n]).into_owned();
                    if window.emit("pty-output", chunk).is_err() {
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

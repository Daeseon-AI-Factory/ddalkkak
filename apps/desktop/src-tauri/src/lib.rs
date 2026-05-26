//! Tauri entry. Per-pane PTY sessions keyed by id.

mod pty;

use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use tauri::{Manager, State, Window};
use tracing::{info, warn};

struct PtyState(Mutex<HashMap<String, pty::PtySession>>);

/// Initialize tracing → daily rolling log at ~/Library/Logs/DalkkakAI/runtime.log.
/// Falls back to a project-local ./logs/ dir if HOME is unavailable.
/// Subscriber is process-global; safe to call once at startup.
fn init_logging() {
    let log_dir = std::env::var("HOME")
        .map(|h| format!("{}/Library/Logs/DalkkakAI", h))
        .unwrap_or_else(|_| "./logs".to_string());
    let _ = std::fs::create_dir_all(&log_dir);

    let file_appender = tracing_appender::rolling::daily(&log_dir, "runtime.log");
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);
    // Leak guard so the writer worker thread lives as long as the app.
    Box::leak(Box::new(guard));

    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info,appsdesktop=debug,appsdesktop_lib=debug"));

    let _ = tracing_subscriber::fmt()
        .with_writer(non_blocking)
        .with_ansi(false)
        .with_target(true)
        .with_env_filter(filter)
        .try_init();

    info!(target: "lifecycle", log_dir = %log_dir, "tracing initialized");
}

#[tauri::command]
fn pty_spawn(
    window: Window,
    id: String,
    cols: u16,
    rows: u16,
    state: State<'_, PtyState>,
) -> Result<(), String> {
    info!(target: "cmd", id = %id, cols, rows, "pty_spawn");
    let session = pty::spawn(window, id.clone(), cols, rows)?;
    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    map.insert(id, session);
    Ok(())
}

#[tauri::command]
fn pty_write(id: String, input: String, state: State<'_, PtyState>) -> Result<(), String> {
    let map = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(session) = map.get(&id) {
        session.write(input.as_bytes())?;
    }
    Ok(())
}

#[tauri::command]
fn pty_resize(id: String, cols: u16, rows: u16, state: State<'_, PtyState>) -> Result<(), String> {
    let map = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(session) = map.get(&id) {
        session.resize(cols, rows)?;
    }
    Ok(())
}

/// Explicit destroy: kill PTY client, AND kill the underlying tmux session so
/// it doesn't leak as a zombie after Close. Called only from explicit Close
/// or Reset actions on the renderer side (via destroyTerminal).
#[tauri::command]
fn pty_kill(id: String, state: State<'_, PtyState>) -> Result<(), String> {
    info!(target: "cmd", id = %id, "pty_kill");
    {
        let mut map = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(session) = map.remove(&id) {
            let _ = session.kill();
        }
    }

    // Also nuke the tmux session so it doesn't survive in the background.
    let tmux_path = ["/opt/homebrew/bin/tmux", "/usr/local/bin/tmux", "/usr/bin/tmux"]
        .iter()
        .find(|p| Path::new(*p).exists())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "tmux".to_string());
    let tmux_session = format!("dalkkak-{}", id);
    match std::process::Command::new(&tmux_path)
        .args(["kill-session", "-t", &tmux_session])
        .output()
    {
        Ok(_) => info!(target: "tmux", session = %tmux_session, "killed"),
        Err(e) => warn!(target: "tmux", session = %tmux_session, error = %e, "kill failed"),
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_logging();
    info!(target: "lifecycle", version = env!("CARGO_PKG_VERSION"), "DalkkakAI starting");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            app.manage(PtyState(Mutex::new(HashMap::new())));
            info!(target: "lifecycle", "tauri app setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            pty_spawn,
            pty_write,
            pty_resize,
            pty_kill
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

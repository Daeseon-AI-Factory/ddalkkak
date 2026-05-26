//! Tauri entry. Per-pane PTY sessions keyed by id.

mod pty;

use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use tauri::{Manager, State, Window};

struct PtyState(Mutex<HashMap<String, pty::PtySession>>);

#[tauri::command]
fn pty_spawn(
    window: Window,
    id: String,
    cols: u16,
    rows: u16,
    state: State<'_, PtyState>,
) -> Result<(), String> {
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
    let _ = std::process::Command::new(&tmux_path)
        .args(["kill-session", "-t", &tmux_session])
        .output();

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            app.manage(PtyState(Mutex::new(HashMap::new())));
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

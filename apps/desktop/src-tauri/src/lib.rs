//! Tauri entry. Exposes pty_* commands; holds a single PtySession in app state.

mod pty;

use std::sync::Mutex;
use tauri::{Manager, State, Window};

/// One PTY session per window (Phase 1.2 — multi-pane comes in 1.3).
struct PtyState(Mutex<Option<pty::PtySession>>);

#[tauri::command]
fn pty_spawn(window: Window, cols: u16, rows: u16, state: State<'_, PtyState>) -> Result<(), String> {
    let session = pty::spawn(window, cols, rows)?;
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    *guard = Some(session);
    Ok(())
}

#[tauri::command]
fn pty_write(input: String, state: State<'_, PtyState>) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(session) = guard.as_ref() {
        session.write(input.as_bytes())?;
    }
    Ok(())
}

#[tauri::command]
fn pty_resize(cols: u16, rows: u16, state: State<'_, PtyState>) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(session) = guard.as_ref() {
        session.resize(cols, rows)?;
    }
    Ok(())
}

#[tauri::command]
fn pty_kill(state: State<'_, PtyState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(session) = guard.as_ref() {
        let _ = session.kill();
    }
    *guard = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            app.manage(PtyState(Mutex::new(None)));
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

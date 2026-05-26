//! Tauri entry. Per-pane PTY sessions keyed by string id.

mod pty;

use std::collections::HashMap;
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

#[tauri::command]
fn pty_kill(id: String, state: State<'_, PtyState>) -> Result<(), String> {
    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(session) = map.remove(&id) {
        let _ = session.kill();
    }
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

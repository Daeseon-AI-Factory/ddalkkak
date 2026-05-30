//! The single chokepoint for ALL project-path filesystem reach.
//!
//! Nothing in this app touches a project path without an entry here. Capture
//! (capture.rs) only ever runs `git -C <root>` where `root` comes from
//! `snapshot()`/`authorize()` — so automation is provably confined to folders the
//! user explicitly granted. See docs/CONNECTIVE_LAYER.md.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// In-memory allowlist of confirmed per-startup project roots (canonical paths).
/// Grants persist in the renderer (localStorage) and are re-pushed here on boot.
pub struct PathAllowlist(Mutex<HashMap<String, PathBuf>>);

impl PathAllowlist {
    pub fn new() -> Self {
        Self(Mutex::new(HashMap::new()))
    }

    /// Grant: canonicalize + symlink-resolve, verify it's a directory, record it.
    /// Returns the canonical path string. The ONLY way a path enters the allowlist.
    pub fn grant(&self, startup_id: &str, requested: &str) -> Result<String, String> {
        let canon = std::fs::canonicalize(requested)
            .map_err(|e| format!("cannot resolve path: {e}"))?;
        if !canon.is_dir() {
            return Err("granted path is not a directory".into());
        }
        let s = canon.to_string_lossy().into_owned();
        self.0
            .lock()
            .map_err(|e| e.to_string())?
            .insert(startup_id.to_string(), canon);
        Ok(s)
    }

    /// Remove a startup's grant (revocation).
    pub fn revoke(&self, startup_id: &str) {
        if let Ok(mut m) = self.0.lock() {
            m.remove(startup_id);
        }
    }

    /// The gate: the confirmed canonical root for a startup, or HARD-REFUSE.
    /// Callers MUST refuse to proceed on Err — never fall back to $HOME.
    pub fn authorize(&self, startup_id: &str) -> Result<PathBuf, String> {
        self.0
            .lock()
            .map_err(|e| e.to_string())?
            .get(startup_id)
            .cloned()
            .ok_or_else(|| format!("no confirmed path grant for startup {startup_id}"))
    }

    /// All granted (startup_id, canonical_root) pairs — for the capture worker.
    pub fn snapshot(&self) -> Vec<(String, PathBuf)> {
        match self.0.lock() {
            Ok(m) => m.iter().map(|(k, v)| (k.clone(), v.clone())).collect(),
            Err(_) => Vec::new(),
        }
    }

    /// Defense-in-depth: a candidate path must live UNDER the granted root.
    /// (Unused in v0 — capture runs `git -C <root>` directly — but kept as the
    /// canonical scope-check for the fs/notify watcher in a later phase.)
    #[allow(dead_code)]
    pub fn contains(&self, startup_id: &str, candidate: &Path) -> Result<bool, String> {
        let root = self.authorize(startup_id)?;
        let c = std::fs::canonicalize(candidate).map_err(|e| e.to_string())?;
        Ok(c.starts_with(&root))
    }
}

impl Default for PathAllowlist {
    fn default() -> Self {
        Self::new()
    }
}

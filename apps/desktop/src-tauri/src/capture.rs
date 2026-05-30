//! capture.rs — post-hoc git-commit capture for the connective layer.
//!
//! OFF the render path: a wall-clock `tokio` timer task that shells out to
//! `git -C <granted-root>` (read-only; git read commands never take
//! `.git/index.lock`, so this can never block a user's commit). It never reads a
//! PTY byte and never touches the terminal registry. Each new commit becomes a
//! `confirmed` `change` node (deterministic node_id = `<startup>/change/<hash>`).
//! See docs/CONNECTIVE_LAYER.md.

use std::collections::{HashMap, HashSet};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

use serde_json::{json, Value};
use tauri::Manager;
use tracing::{info, warn};

use crate::paths::PathAllowlist;

const SCHEMA_VERSION: u64 = 1;
const POLL_SECS: u64 = 20;
const SINCE: &str = "72.hours";

/// Append-only JSONL graph store, partitioned by startup, under the OS app-data dir.
/// An in-memory per-startup node_id set gives O(1) idempotent dedup.
pub struct GraphStore {
    dir: PathBuf,
    seen: Mutex<HashMap<String, HashSet<String>>>, // startup_id -> set<node_id>
}

impl GraphStore {
    pub fn new() -> Self {
        let dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("DalkkakAI")
            .join("graph");
        let _ = std::fs::create_dir_all(&dir);
        Self {
            dir,
            seen: Mutex::new(HashMap::new()),
        }
    }

    fn file_for(&self, startup_id: &str) -> PathBuf {
        // startup ids are our own slugs (startup-<base36>) — safe filenames.
        self.dir.join(format!("{startup_id}.jsonl"))
    }

    /// Hydrate the in-memory seen-set for a startup from its JSONL file (once).
    fn ensure_hydrated(&self, startup_id: &str) {
        let mut seen = match self.seen.lock() {
            Ok(s) => s,
            Err(_) => return,
        };
        if seen.contains_key(startup_id) {
            return;
        }
        let mut ids = HashSet::new();
        if let Ok(content) = std::fs::read_to_string(self.file_for(startup_id)) {
            for line in content.lines() {
                if let Ok(v) = serde_json::from_str::<Value>(line) {
                    if let Some(id) = v.get("node_id").and_then(|x| x.as_str()) {
                        ids.insert(id.to_string());
                    }
                }
            }
        }
        seen.insert(startup_id.to_string(), ids);
    }

    pub fn has(&self, startup_id: &str, node_id: &str) -> bool {
        self.ensure_hydrated(startup_id);
        self.seen
            .lock()
            .ok()
            .and_then(|s| s.get(startup_id).map(|set| set.contains(node_id)))
            .unwrap_or(false)
    }

    /// Append a node IFF it passes the same checks as packages/shared/src/validate.ts
    /// (defense-in-depth: a malformed record never lands even if it bypasses the
    /// renderer). Idempotent on node_id.
    pub fn append(&self, startup_id: &str, node: Value) -> Result<(), String> {
        let node_id = node
            .get("node_id")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .ok_or("node_id missing")?
            .to_string();
        let title_ok = node
            .get("title")
            .and_then(|v| v.as_str())
            .map(|s| !s.trim().is_empty())
            .unwrap_or(false);
        if !title_ok {
            return Err("empty title".into());
        }
        let prov = node.get("provenance").and_then(|v| v.as_str()).unwrap_or("");
        if !matches!(prov, "confirmed" | "inferred" | "hypothesis") {
            return Err("bad provenance".into());
        }
        if prov == "confirmed" && !node.get("evidence").map(|e| e.is_object()).unwrap_or(false) {
            return Err("confirmed node lacks evidence".into());
        }

        self.ensure_hydrated(startup_id);
        if self.has(startup_id, &node_id) {
            return Ok(()); // idempotent
        }

        let line = serde_json::to_string(&node).map_err(|e| e.to_string())?;
        let mut f = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(self.file_for(startup_id))
            .map_err(|e| e.to_string())?;
        writeln!(f, "{line}").map_err(|e| e.to_string())?;

        if let Ok(mut seen) = self.seen.lock() {
            seen.entry(startup_id.to_string())
                .or_default()
                .insert(node_id);
        }
        Ok(())
    }

    /// Read all nodes across all startups (order not guaranteed; renderer sorts).
    pub fn read_all(&self) -> Vec<Value> {
        let mut out = Vec::new();
        if let Ok(entries) = std::fs::read_dir(&self.dir) {
            for e in entries.flatten() {
                if e.path().extension().and_then(|x| x.to_str()) != Some("jsonl") {
                    continue;
                }
                if let Ok(content) = std::fs::read_to_string(e.path()) {
                    for line in content.lines() {
                        if let Ok(v) = serde_json::from_str::<Value>(line) {
                            out.push(v);
                        }
                    }
                }
            }
        }
        out
    }
}

impl Default for GraphStore {
    fn default() -> Self {
        Self::new()
    }
}

/// Run a read-only git command in `root`; return stdout (lossy utf8) or "".
async fn run_git(root: &Path, args: &[&str]) -> String {
    match tokio::process::Command::new("git")
        .arg("-C")
        .arg(root)
        .args(args)
        .output()
        .await
    {
        Ok(o) => String::from_utf8_lossy(&o.stdout).into_owned(),
        Err(e) => {
            warn!(target: "capture", error = %e, "git failed");
            String::new()
        }
    }
}

/// Build a `confirmed` `change` node from git commit fields.
fn change_node(startup_id: &str, hash: &str, occurred: &str, subject: &str, stat: &str) -> Value {
    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    let t = subject.trim();
    let title = if t.chars().count() > 200 {
        format!("{}…", t.chars().take(199).collect::<String>())
    } else {
        t.to_string()
    };
    json!({
        "schema_version": SCHEMA_VERSION,
        "node_id": format!("{startup_id}/change/{hash}"),
        "startup_id": startup_id,
        "node_type": "change",
        "provenance": "confirmed",
        "created_at": now,
        "title": title,
        "body": stat.trim(),
        "evidence": { "source": "git", "hash": hash, "occurred_at": occurred },
    })
}

/// One poll: for each granted startup, ingest new commits as confirmed change nodes.
pub async fn poll_once(app: &tauri::AppHandle) {
    let grants = app.state::<PathAllowlist>().snapshot();
    let store = app.state::<GraphStore>();
    for (startup_id, root) in grants {
        // \x1f between fields, NUL between records.
        let log = run_git(
            &root,
            &[
                "log",
                "--no-merges",
                &format!("--since={SINCE}"),
                "--pretty=format:%H\x1f%cI\x1f%s",
                "-z",
            ],
        )
        .await;
        if log.is_empty() {
            continue;
        }
        for rec in log.split('\0') {
            let rec = rec.trim();
            if rec.is_empty() {
                continue;
            }
            let mut parts = rec.splitn(3, '\x1f');
            let (hash, occurred, subject) = match (parts.next(), parts.next(), parts.next()) {
                (Some(h), Some(o), Some(s)) if !h.is_empty() => (h, o, s),
                _ => continue,
            };
            let node_id = format!("{startup_id}/change/{hash}");
            if store.has(&startup_id, &node_id) {
                continue;
            }
            let stat = run_git(&root, &["show", "--stat", "--oneline", "--no-color", hash]).await;
            match store.append(&startup_id, change_node(&startup_id, hash, occurred, subject, &stat)) {
                Ok(()) => info!(target: "capture", startup_id = %startup_id, hash = %hash, "change node"),
                Err(e) => warn!(target: "capture", startup_id = %startup_id, error = %e, "append rejected"),
            }
        }
    }
}

/// Spawn the periodic capture worker (call once from setup()). First tick is immediate.
pub fn spawn_worker(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_secs(POLL_SECS));
        loop {
            tick.tick().await;
            poll_once(&app).await;
        }
    });
}

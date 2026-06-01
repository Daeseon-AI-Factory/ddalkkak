//! Usage Pulse (ADR-005, `docs/USAGE_PULSE.md`) — read-time, ZERO-storage rollups across
//! startups. On view-open it rolls metrics from data already on disk and persists NOTHING:
//!   - the hook stream (`session-events.jsonl`) — which DalkkakAI sessions ran, + block/active
//!   - each of THOSE sessions' native transcript JSONL — output / steps / tool-mix / errors
//!   - GraphStore change nodes — commits per startup/day
//!
//! Honest units only: OUTPUT tokens (never total/cache → see `session_usage`), active days,
//! counts. No `$`. Counts & enums only — never tool inputs/paths/content/error text.
//! Startup attribution = the transcript/hook `cwd` matched to a granted root (longest-prefix
//! wins; ambiguity/no-match → "unassigned", never guessed, never dropped).

use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

use chrono::{DateTime, Duration, Local, NaiveDate, Utc};
use serde_json::{json, Value};

use crate::summarize::is_user_prompt;

const UNASSIGNED: &str = "unassigned";
const WINDOW_DAYS: i64 = 14; // we only ever show the last 14 days

/// Coarse tool category — only `tool_name` (an enum) is ever read, never its input.
fn tool_category(name: &str) -> &'static str {
    match name {
        "Edit" | "Write" | "Bash" | "MultiEdit" | "NotebookEdit" => "produce",
        "Read" | "Grep" | "Glob" | "ToolSearch" | "WebSearch" | "WebFetch" | "NotebookRead" => {
            "explore"
        }
        _ => "other",
    }
}

/// Attribute a cwd to a startup via LONGEST-prefix-wins over granted roots; ambiguity or
/// no match → "unassigned" (never confidently-wrong on nested/shared roots).
fn attribute(cwd: &str, grants: &[(String, PathBuf)]) -> String {
    let mut best: Option<(usize, String)> = None;
    for (sid, root) in grants {
        let r = root.to_string_lossy();
        let under = cwd == r.as_ref() || cwd.starts_with(&format!("{r}/"));
        if !under {
            continue;
        }
        let len = r.len();
        match &best {
            Some((bl, _)) if *bl >= len => {}
            _ => best = Some((len, sid.clone())),
        }
    }
    best.map(|(_, s)| s).unwrap_or_else(|| UNASSIGNED.to_string())
}

/// Local-tz (Toronto on Jason's machine) day string from a unix-epoch-seconds float.
fn day_from_epoch(secs: f64) -> Option<String> {
    DateTime::<Utc>::from_timestamp(secs as i64, 0)
        .map(|dt| dt.with_timezone(&Local).format("%Y-%m-%d").to_string())
}

/// Local-tz day string from an ISO-8601 timestamp (`...Z`).
fn day_from_iso(s: &str) -> Option<String> {
    DateTime::parse_from_rfc3339(s)
        .ok()
        .map(|dt| dt.with_timezone(&Local).format("%Y-%m-%d").to_string())
}

#[derive(Default)]
struct DayAcc {
    output: u64,
    turns: u64,
    steps: u64,
    commits: u64,
    blocks: u64,
    tool_errors: u64,
    explore: u64,
    produce: u64,
    other_tools: u64,
    active: bool,
}

#[derive(Default)]
struct StartupAcc {
    days: HashMap<String, DayAcc>,
    /// (day, steps-in-that-turn) for the fan-out view (recent vs own baseline).
    turn_steps: Vec<(String, u64)>,
}

/// Parse one DalkkakAI-run transcript into the per-startup accumulator.
fn parse_transcript(content: &str, hook_cwd: &str, grants: &[(String, PathBuf)], out: &mut HashMap<String, StartupAcc>) {
    // Transcript's own recorded cwd is authoritative; fall back to the hook line's cwd.
    let mut cwd = hook_cwd.to_string();
    for line in content.lines().take(8) {
        if let Ok(v) = serde_json::from_str::<Value>(line) {
            if let Some(c) = v.get("cwd").and_then(|x| x.as_str()) {
                cwd = c.to_string();
                break;
            }
        }
    }
    let sid = attribute(&cwd, grants);

    let mut days: HashMap<String, DayAcc> = HashMap::new();
    let mut turn_steps: Vec<(String, u64)> = Vec::new();
    let mut cur_steps = 0u64;
    let mut cur_day: Option<String> = None;
    let mut in_turn = false;

    for line in content.lines() {
        let Ok(v) = serde_json::from_str::<Value>(line) else {
            continue;
        };

        if is_user_prompt(&v) {
            if in_turn {
                if let Some(d) = cur_day.take() {
                    turn_steps.push((d, cur_steps));
                }
            }
            cur_steps = 0;
            in_turn = true;
            if let Some(day) = v.get("timestamp").and_then(|x| x.as_str()).and_then(day_from_iso) {
                let e = days.entry(day).or_default();
                e.turns += 1;
                e.active = true;
            }
            continue;
        }

        let ty = v.get("type").and_then(|x| x.as_str()).unwrap_or("");
        if ty == "assistant" {
            let day = v.get("timestamp").and_then(|x| x.as_str()).and_then(day_from_iso);
            if cur_day.is_none() {
                cur_day = day.clone();
            }
            cur_steps += 1;
            in_turn = true;
            if let Some(ref d) = day {
                let e = days.entry(d.clone()).or_default();
                e.steps += 1;
                e.active = true;
                if let Some(u) = v.get("message").and_then(|m| m.get("usage")) {
                    e.output += u.get("output_tokens").and_then(|x| x.as_u64()).unwrap_or(0);
                }
                if let Some(blocks) = v.get("message").and_then(|m| m.get("content")).and_then(|c| c.as_array()) {
                    for b in blocks {
                        if b.get("type").and_then(|x| x.as_str()) == Some("tool_use") {
                            let name = b.get("name").and_then(|x| x.as_str()).unwrap_or("");
                            match tool_category(name) {
                                "produce" => e.produce += 1,
                                "explore" => e.explore += 1,
                                _ => e.other_tools += 1,
                            }
                        }
                    }
                }
            }
        } else if ty == "user" {
            // tool_result messages (is_user_prompt already excluded real prompts above).
            let day = v.get("timestamp").and_then(|x| x.as_str()).and_then(day_from_iso);
            if let (Some(d), Some(blocks)) = (
                day,
                v.get("message").and_then(|m| m.get("content")).and_then(|c| c.as_array()),
            ) {
                for b in blocks {
                    if b.get("type").and_then(|x| x.as_str()) == Some("tool_result")
                        && b.get("is_error").and_then(|x| x.as_bool()) == Some(true)
                    {
                        days.entry(d.clone()).or_default().tool_errors += 1;
                    }
                }
            }
        }
    }
    if in_turn {
        if let Some(d) = cur_day.take() {
            turn_steps.push((d, cur_steps));
        }
    }

    let acc = out.entry(sid).or_default();
    for (day, d) in days {
        let e = acc.days.entry(day).or_default();
        e.output += d.output;
        e.turns += d.turns;
        e.steps += d.steps;
        e.tool_errors += d.tool_errors;
        e.explore += d.explore;
        e.produce += d.produce;
        e.other_tools += d.other_tools;
        if d.active {
            e.active = true;
        }
    }
    acc.turn_steps.extend(turn_steps);
}

/// Build the whole pulse. `grants` from PathAllowlist::snapshot; `graph_nodes` from
/// GraphStore::read_all. Pure + read-only; persists nothing.
pub fn usage_pulse(grants: Vec<(String, PathBuf)>, graph_nodes: Vec<Value>) -> Result<Value, String> {
    let events_path = crate::hooks::events_path().ok_or("no data dir for session events")?;
    let hook_content = std::fs::read_to_string(&events_path).unwrap_or_default();

    let cutoff = Utc::now().timestamp() as f64 - (WINDOW_DAYS as f64 + 1.0) * 86400.0;
    let mut tpaths: HashMap<String, (String, f64)> = HashMap::new(); // tpath -> (cwd, max_ts)
    let mut hook_min_ts: Option<f64> = None;
    let mut startups: HashMap<String, StartupAcc> = HashMap::new();

    // Pass 1 — hook stream: which sessions ran (tpaths), + per-startup block/active by day.
    for line in hook_content.lines() {
        let Ok(v) = serde_json::from_str::<Value>(line) else {
            continue;
        };
        let event = v.get("event").and_then(|x| x.as_str()).unwrap_or("");
        let cwd = v.get("cwd").and_then(|x| x.as_str()).unwrap_or("");
        let tpath = v.get("tpath").and_then(|x| x.as_str()).unwrap_or("");
        let Some(ts) = v.get("ts").and_then(|x| x.as_f64()) else {
            continue;
        };
        hook_min_ts = Some(hook_min_ts.map_or(ts, |m| m.min(ts)));
        if !tpath.is_empty() && !cwd.is_empty() {
            let entry = tpaths.entry(tpath.to_string()).or_insert((cwd.to_string(), ts));
            if ts > entry.1 {
                entry.1 = ts;
            }
        }
        if let Some(day) = day_from_epoch(ts) {
            let sid = attribute(cwd, &grants);
            let e = startups.entry(sid).or_default().days.entry(day).or_default();
            e.active = true;
            if event == "Notification" {
                e.blocks += 1;
            }
        }
    }

    // Pass 2 — parse each recent DalkkakAI-run transcript (skip ones older than the window).
    for (tpath, (cwd, max_ts)) in &tpaths {
        if *max_ts < cutoff {
            continue;
        }
        if let Ok(content) = std::fs::read_to_string(tpath) {
            parse_transcript(&content, cwd, &grants, &mut startups);
        }
    }

    // Pass 3 — commits from GraphStore change nodes (already per-startup, occurred_at dated).
    for node in &graph_nodes {
        if node.get("node_type").and_then(|x| x.as_str()) != Some("change") {
            continue;
        }
        let sid = node.get("startup_id").and_then(|x| x.as_str()).unwrap_or("");
        if sid.is_empty() {
            continue;
        }
        let day = node
            .get("evidence")
            .and_then(|e| e.get("occurred_at"))
            .and_then(|x| x.as_str())
            .and_then(day_from_iso);
        if let Some(day) = day {
            let e = startups.entry(sid.to_string()).or_default().days.entry(day).or_default();
            e.commits += 1;
            e.active = true;
        }
    }

    // Assemble — windows in LOCAL tz.
    let today = Local::now().date_naive();
    let day_str = |n: i64| (today - Duration::days(n)).format("%Y-%m-%d").to_string();
    let days_window: Vec<String> = (0..WINDOW_DAYS).map(day_str).collect(); // today .. 13d ago
    let days_7: HashSet<String> = (0..7).map(day_str).collect();
    let mean = |v: &[u64]| -> f64 {
        if v.is_empty() {
            0.0
        } else {
            (v.iter().sum::<u64>() as f64 / v.len() as f64 * 10.0).round() / 10.0
        }
    };

    let mut out = Vec::new();
    for (sid, acc) in &startups {
        let (mut output_week, mut turns_week, mut commits_week, mut blocks_week, mut errors_week) =
            (0u64, 0u64, 0u64, 0u64, 0u64);
        let (mut explore, mut produce, mut other) = (0u64, 0u64, 0u64);
        let mut active_days_14 = 0u64;
        let mut last_active: Option<NaiveDate> = None;

        for (day, d) in &acc.days {
            if d.active {
                if let Ok(date) = NaiveDate::parse_from_str(day, "%Y-%m-%d") {
                    last_active = Some(last_active.map_or(date, |l| l.max(date)));
                }
                if days_window.contains(day) {
                    active_days_14 += 1;
                }
            }
            if days_7.contains(day) {
                output_week += d.output;
                turns_week += d.turns;
                commits_week += d.commits;
                blocks_week += d.blocks;
                errors_week += d.tool_errors;
                explore += d.explore;
                produce += d.produce;
                other += d.other_tools;
            }
        }

        let recent: Vec<u64> = acc.turn_steps.iter().filter(|(d, _)| days_7.contains(d)).map(|(_, s)| *s).collect();
        let all: Vec<u64> = acc.turn_steps.iter().map(|(_, s)| *s).collect();
        let days_since = last_active.map(|la| (today - la).num_days());

        let daily: Vec<Value> = days_window
            .iter()
            .rev()
            .map(|day| {
                let d = acc.days.get(day);
                json!({
                    "day": day,
                    "output": d.map(|x| x.output).unwrap_or(0),
                    "turns": d.map(|x| x.turns).unwrap_or(0),
                    "commits": d.map(|x| x.commits).unwrap_or(0),
                    "blocks": d.map(|x| x.blocks).unwrap_or(0),
                    "active": d.map(|x| x.active).unwrap_or(false),
                })
            })
            .collect();

        out.push(json!({
            "startup_id": sid,
            "output_week": output_week,
            "active_days_14": active_days_14,
            "days_since_active": days_since,
            "steps_recent": mean(&recent),
            "steps_baseline": mean(&all),
            "tool_explore": explore,
            "tool_produce": produce,
            "tool_other": other,
            "blocks_week": blocks_week,
            "tool_errors_week": errors_week,
            "turns_week": turns_week,
            "commits_week": commits_week,
            "daily": daily,
        }));
    }

    // Biggest effort first; the renderer can re-sort.
    out.sort_by(|a, b| {
        let g = |v: &Value| v.get("output_week").and_then(|x| x.as_u64()).unwrap_or(0);
        g(b).cmp(&g(a))
    });

    Ok(json!({
        "generated_day": today.format("%Y-%m-%d").to_string(),
        "block_history_since": hook_min_ts.and_then(day_from_epoch),
        "startups": out,
    }))
}

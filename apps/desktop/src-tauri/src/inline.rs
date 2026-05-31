//! In-line self-summary (ADR-003): a DalkkakAI-only `claude` wrapper that appends a tiny
//! summary directive via --append-system-prompt, so the pane's OWN Claude emits a
//! `<dk-summary>{viz}</dk-summary>` block as a byproduct of each reply. The app captures
//! + strips that block from the stream (terminalRegistry). Free, instant, accurate.
//!
//! Scoping: we prepend `<data_dir>/DalkkakAI/bin` to a pane's PATH (pty.rs) so the wrapper
//! ONLY shadows `claude` inside DalkkakAI panes — the user's Claude everywhere else is
//! untouched. The directive is emphatic that it must NOT change the actual work.

use std::path::{Path, PathBuf};
use tracing::info;

/// Tiny, non-intrusive directive appended to the pane Claude's system prompt.
const DIRECTIVE: &str = r#"DALKKAK INLINE SUMMARY — a tool reads this; it does NOT change your task. Do your work and reply EXACTLY as you normally would. Then, as the very LAST line of your reply, append ONE compact JSON summary of what this turn did, wrapped EXACTLY as: <dk-summary>{...}</dk-summary>

Shape {"kind":K,"data":{...}}, K = one of recap | plan | question | concept | note:
- recap (just finished): {"headline":str,"tone":"success"|"warning"|"error","changed":[{"what":str,"path"?:str}],"next_step"?:str}
- plan (mid-task): {"title":str,"phase":"working","steps":[{"name":str,"status":"done"|"now"|"todo"}]}
- question (you're asking the user / blocked): {"question":str,"options":[{"label":str,"pros"?:[str],"cons"?:[str],"recommended"?:bool}],"urgency":"blocking"|"fyi"}
- concept (you used a tech term they may not know — explain it): {"concept":str,"tagline":str,"analogy":{"name":str,"icon":str},"comparison":{"without":{"icon":str,"label":str,"steps":[str],"metric":str},"with":{"icon":str,"label":str,"steps":[str],"metric":str}},"tradeoffs":{"pros":[str],"cons":[str]},"real_world":str}
- note (anything else / thin): {"title":str,"tone":"info"|"success"|"warning"|"error","body"?:str}

Rules: plain language for a NON-ENGINEER; match the user's language; headline/title <=12 words; only facts from this turn; keep it tiny; the block is the FINAL line only; NEVER mention it and NEVER let it change your actual reply."#;

/// Resolve the real `claude` binary (the wrapper must exec this absolute path, not itself).
fn find_claude() -> String {
    let home = std::env::var("HOME").unwrap_or_default();
    for c in [
        format!("{home}/.local/bin/claude"),
        "/opt/homebrew/bin/claude".to_string(),
        "/usr/local/bin/claude".to_string(),
        format!("{home}/.claude/local/claude"),
    ] {
        if Path::new(&c).exists() {
            return c;
        }
    }
    "claude".to_string()
}

/// `<data_dir>/DalkkakAI/bin` — the DalkkakAI-only PATH dir holding the `claude` wrapper.
pub fn bin_dir() -> Option<PathBuf> {
    Some(dirs::data_dir()?.join("DalkkakAI").join("bin"))
}

/// Idempotently (re)write the wrapper + directive; returns the bin dir to prepend to PATH.
pub fn ensure_wrapper() -> Option<PathBuf> {
    let dir = bin_dir()?;
    std::fs::create_dir_all(&dir).ok()?;

    let directive_path = dir.join("dk-directive.txt");
    let _ = std::fs::write(&directive_path, DIRECTIVE);

    let real = find_claude();
    // `"$(cat '<path>')"` passes the file contents verbatim as one arg (inner quotes in the
    // directive are NOT re-parsed by the shell), so the directive's JSON quotes are safe.
    let script = format!(
        "#!/bin/bash\nexec \"{real}\" --append-system-prompt \"$(cat '{dir_p}')\" \"$@\"\n",
        real = real,
        dir_p = directive_path.display(),
    );
    let wrapper = dir.join("claude");
    std::fs::write(&wrapper, script).ok()?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&wrapper, std::fs::Permissions::from_mode(0o755));
    }
    Some(dir)
}

const MARKER: &str = "DalkkakAI (auto)";

// A guarded `claude` shell function (functions take precedence over PATH, so this wins
// even when the user's rc prepends ~/.local/bin). Active ONLY inside DalkkakAI panes
// (the DALKKAK_PANE_ID guard); reversible by deleting the block.
const ZSHRC_BLOCK: &str = r#"
# >>> DalkkakAI (auto) — in-line session summary; DalkkakAI panes only; delete this block to disable >>>
if [ -n "$DALKKAK_PANE_ID" ] && [ -f "$HOME/Library/Application Support/DalkkakAI/bin/dk-directive.txt" ]; then
  claude() { command claude --append-system-prompt "$(cat "$HOME/Library/Application Support/DalkkakAI/bin/dk-directive.txt")" "$@"; }
fi
# <<< DalkkakAI (auto) <<<
"#;

/// Install the guarded `claude` function into ~/.zshrc — BULLETPROOF by construction:
/// - **idempotent**: bail if the marker is already present (never double-add);
/// - **backs up once** to ~/.zshrc.dalkkak-bak before the first change;
/// - **APPEND-ONLY**: never reads-for-rewrite or parses the user's file — only appends the
///   block, so existing content cannot be corrupted, only added to.
/// Guarded by DALKKAK_PANE_ID → only acts in DalkkakAI panes. See docs/DECISIONS.md ADR-003.
pub fn ensure_shell_function() {
    let Some(home) = std::env::var_os("HOME") else {
        return;
    };
    let zshrc = PathBuf::from(&home).join(".zshrc");
    let existing = std::fs::read_to_string(&zshrc).unwrap_or_default();
    if existing.contains(MARKER) {
        return; // already installed — never double-add
    }
    if !existing.is_empty() {
        let bak = PathBuf::from(&home).join(".zshrc.dalkkak-bak");
        if !bak.exists() {
            let _ = std::fs::write(&bak, existing.as_bytes());
        }
    }
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&zshrc) {
        if f.write_all(ZSHRC_BLOCK.as_bytes()).is_ok() {
            info!(target: "inline", "installed DalkkakAI claude function in ~/.zshrc (append-only, backed up)");
        }
    }
}

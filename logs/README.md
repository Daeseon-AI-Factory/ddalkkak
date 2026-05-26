# logs/ — auto-generated raw logs

Two sources:

## Source 1 — Claude Code hooks (development meta)
Wired in `.claude/settings.json`. Captures every Bash/Edit/Write/Prompt
during development sessions.

- `actions.jsonl` — every Bash tool execution
- `edits.jsonl`   — every Edit/Write/NotebookEdit
- `prompts.jsonl` — every user prompt
- `sessions.jsonl` — Stop events (session boundaries)

## Source 2 — Product runtime (DalkkakAI .app)
Tauri Rust backend uses `tracing` + `tracing-appender`. Daily rolling log:
- `~/Library/Logs/DalkkakAI/runtime.log.YYYY-MM-DD`

## Usage
- These files are git-ignored. Local only.
- Use them as raw material when authoring `docs/ISSUES.md` post-mortems
  or `docs/MILESTONES.md` 3-tone entries.
- Periodically grep / jq to find patterns:
  ```bash
  jq 'select(.tool == "Bash") | .cmd' logs/actions.jsonl | sort | uniq -c | sort -rn | head
  ```

import { useState } from "react";
import {
  generateStartupId,
  pickDefaultEmoji,
  type Startup,
} from "./startups";

interface Props {
  startups: Startup[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (s: Startup) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
}

export function Sidebar({ startups, activeId, onSelect, onCreate, onContextMenu }: Props) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const name = draft.trim() || `startup-${startups.length + 1}`;
    onCreate({
      id: generateStartupId(),
      name,
      emoji: pickDefaultEmoji(),
      createdAt: Date.now(),
    });
    setDraft("");
    setCreating(false);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-list">
        {startups.map((s, i) => (
          <div key={s.id} style={{ position: "relative", display: "flex", alignItems: "stretch" }}>
            <button
              className={`startup-item ${s.id === activeId ? "active" : ""}`}
              onClick={() => onSelect(s.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(s.id, e.clientX, e.clientY);
              }}
              title={s.name}
              style={{ flex: 1 }}
            >
              <span className="startup-emoji">{s.emoji}</span>
              <span className="startup-name">{s.name}</span>
              {i < 9 && <span className="startup-key">⌃{i + 1}</span>}
            </button>
            <button
              type="button"
              aria-label={`Options for ${s.name}`}
              title="Options — rename, grant folder, delete…"
              onClick={(e) => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                onContextMenu(s.id, r.right, r.bottom);
              }}
              style={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "#8b949e",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              ⋯
            </button>
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        {creating ? (
          <div className="new-startup">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") {
                  setCreating(false);
                  setDraft("");
                }
              }}
              onBlur={() => {
                if (!draft.trim()) {
                  setCreating(false);
                }
              }}
              placeholder="startup name"
            />
          </div>
        ) : (
          <button className="add-startup" onClick={() => setCreating(true)} title="New startup">
            + New
          </button>
        )}
      </div>
    </div>
  );
}

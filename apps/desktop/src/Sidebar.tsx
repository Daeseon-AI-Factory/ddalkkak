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
}

export function Sidebar({ startups, activeId, onSelect, onCreate }: Props) {
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
        {startups.map((s) => (
          <button
            key={s.id}
            className={`startup-item ${s.id === activeId ? "active" : ""}`}
            onClick={() => onSelect(s.id)}
            title={s.name}
          >
            <span className="startup-emoji">{s.emoji}</span>
            <span className="startup-name">{s.name}</span>
          </button>
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

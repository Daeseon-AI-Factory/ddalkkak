//! In-app keyboard-shortcut guide. Opened with ⌘/ or the toolbar "⌨ Keys" button,
//! closed with ⌘/ again, Esc, or a backdrop click. Mirrors docs/SHORTCUTS.md (the
//! canonical list) — keep them in sync when shortcuts change.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { c } from "./viz/tokens";

interface Row {
  keys: string[];
  label: string;
}
interface Group {
  title: string;
  hint?: string;
  rows: Row[];
}

const GROUPS: Group[] = [
  {
    title: "Panes",
    hint: "⌘ Command — stays within the current startup",
    rows: [
      { keys: ["⌘", "D"], label: "Split focused pane right" },
      { keys: ["⌘", "⇧", "D"], label: "Stack focused pane below" },
      { keys: ["⌘", "W"], label: "Close focused pane" },
      { keys: ["⌘", "1–9"], label: "Focus pane by index" },
      { keys: ["⌘", "["], label: "Focus previous pane" },
      { keys: ["⌘", "]"], label: "Focus next pane" },
      { keys: ["⌘", "I"], label: "Summarize focused pane (✨)" },
      { keys: ["Esc"], label: "Close the summary popup" },
    ],
  },
  {
    title: "Startups",
    hint: "⌃ Control — moves between startups (like Arc spaces)",
    rows: [
      { keys: ["⌃", "1–9"], label: "Switch to startup by index" },
      { keys: ["⌃", "Tab"], label: "Next startup" },
      { keys: ["⌃", "⇧", "Tab"], label: "Previous startup" },
      { keys: ["right-click"], label: "Sidebar item → rename / emoji / delete" },
    ],
  },
  {
    title: "App",
    rows: [
      { keys: ["⌘", "/"], label: "This shortcuts guide (toggle)" },
      { keys: ["📊"], label: "Toolbar → connective graph" },
    ],
  },
  {
    title: "Inside a pane (terminal)",
    hint: "Standard keys pass through to the shell — ⌘ never reaches the terminal",
    rows: [
      { keys: ["⌃", "C"], label: "Interrupt (SIGINT)" },
      { keys: ["⌃", "D"], label: "EOF — close shell stdin" },
      { keys: ["⌃", "L"], label: "Clear screen" },
      { keys: ["⌃", "R"], label: "Reverse history search" },
      { keys: ["⌃", "B", '"'], label: "tmux sub-split (inside one pane)" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      style={{
        display: "inline-block",
        minWidth: 18,
        padding: "2px 6px",
        textAlign: "center",
        fontSize: 11,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        color: c.text,
        background: "#1b2230",
        border: `1px solid ${c.border}`,
        borderRadius: 5,
        boxShadow: "0 1px 0 rgba(0,0,0,0.4)",
      }}
    >
      {children}
    </kbd>
  );
}

export function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Esc closes (capture phase + stopPropagation so it doesn't reach App's nav handler).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    // biome-ignore lint/a11y: click-backdrop-to-close is intentional
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 2100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(760px, 94vw)",
          maxHeight: "88vh",
          overflow: "auto",
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          padding: 22,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <strong style={{ color: c.text, fontSize: 16 }}>⌨ Keyboard shortcuts</strong>
          <button type="button" onClick={onClose} style={{ fontSize: 14 }}>
            ✕
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 22,
          }}
        >
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div style={{ color: c.accent, fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                {g.title}
              </div>
              {g.hint && (
                <div style={{ color: c.dim, fontSize: 11, marginBottom: 8 }}>{g.hint}</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {g.rows.map((r) => (
                  <div
                    key={r.label}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
                  >
                    <span style={{ display: "flex", gap: 3, flexShrink: 0, width: 96 }}>
                      {r.keys.map((k, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </span>
                    <span style={{ color: c.muted }}>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ color: c.dim, fontSize: 11, marginTop: 18, textAlign: "right" }}>
          Canonical list: <code>docs/SHORTCUTS.md</code>
        </div>
      </div>
    </div>,
    document.body,
  );
}

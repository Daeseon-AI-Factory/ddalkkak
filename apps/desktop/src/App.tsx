import { useEffect, useState } from "react";
import { Mosaic, MosaicWindow, type MosaicNode } from "react-mosaic-component";
import "react-mosaic-component/react-mosaic-component.css";
import { Sidebar } from "./Sidebar";
import { TerminalPane } from "./TerminalPane";
import { destroyTerminal } from "./terminalRegistry";
import {
  layoutKeyFor,
  loadActiveStartupId,
  loadStartups,
  saveActiveStartupId,
  saveStartups,
  generateStartupId,
  type Startup,
} from "./startups";
import "./App.css";

type PaneId = string;

const generateId = (): PaneId =>
  `pane-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ─── Layout (per startup) ───────────────────────────────────────────────────
function loadLayoutFor(startupId: string): MosaicNode<PaneId> | null {
  try {
    const raw = localStorage.getItem(layoutKeyFor(startupId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed === null) return null;
    if (typeof parsed === "string") return parsed;
    if (
      typeof parsed === "object" &&
      "direction" in parsed &&
      "first" in parsed &&
      "second" in parsed
    ) {
      return parsed as MosaicNode<PaneId>;
    }
    return null;
  } catch {
    return null;
  }
}

function saveLayoutFor(startupId: string, layout: MosaicNode<PaneId>) {
  // Note: never accepts null. Callers must not pass null here.
  // Null transient states should be filtered upstream.
  try {
    localStorage.setItem(layoutKeyFor(startupId), JSON.stringify(layout));
  } catch {
    /* best-effort */
  }
}

function removeLayoutFor(startupId: string) {
  try {
    localStorage.removeItem(layoutKeyFor(startupId));
  } catch {
    /* best-effort */
  }
}

function collectIds(node: MosaicNode<PaneId> | null): PaneId[] {
  if (!node) return [];
  if (typeof node === "string") return [node];
  return [...collectIds(node.first), ...collectIds(node.second)];
}

function replaceLeaf(
  node: MosaicNode<PaneId>,
  targetId: PaneId,
  replacement: MosaicNode<PaneId>,
): MosaicNode<PaneId> {
  if (typeof node === "string") {
    return node === targetId ? replacement : node;
  }
  return {
    ...node,
    first: replaceLeaf(node.first, targetId, replacement),
    second: replaceLeaf(node.second, targetId, replacement),
  };
}

function removeLeaf(
  node: MosaicNode<PaneId>,
  targetId: PaneId,
): MosaicNode<PaneId> | null {
  if (typeof node === "string") {
    return node === targetId ? null : node;
  }
  const first = removeLeaf(node.first, targetId);
  const second = removeLeaf(node.second, targetId);
  if (first === null) return second;
  if (second === null) return first;
  return { ...node, first, second };
}

// ─── Migration ─────────────────────────────────────────────────────────────
const LEGACY_LAYOUT_KEY = "dalkkak.layout.v1";

function migrateLegacyLayout(targetStartupId: string) {
  try {
    const legacy = localStorage.getItem(LEGACY_LAYOUT_KEY);
    if (!legacy) return;
    if (!localStorage.getItem(layoutKeyFor(targetStartupId))) {
      localStorage.setItem(layoutKeyFor(targetStartupId), legacy);
    }
    localStorage.removeItem(LEGACY_LAYOUT_KEY);
  } catch {
    /* best-effort */
  }
}

// ─── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [startups, setStartups] = useState<Startup[]>(() => loadStartups());
  const [activeStartupId, setActiveStartupId] = useState<string | null>(() =>
    loadActiveStartupId(),
  );
  const [layout, setLayout] = useState<MosaicNode<PaneId> | null>(null);
  const [focusedId, setFocusedId] = useState<PaneId | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    () => !localStorage.getItem("dalkkak.onboarded.v1"),
  );

  const dismissOnboarding = () => {
    try { localStorage.setItem("dalkkak.onboarded.v1", "1"); } catch {}
    setShowOnboarding(false);
  };

  // Bootstrap: if no startups exist, create a default one and migrate legacy layout.
  useEffect(() => {
    if (startups.length === 0) {
      const first: Startup = {
        id: generateStartupId(),
        name: "default",
        emoji: "🚀",
        createdAt: Date.now(),
      };
      migrateLegacyLayout(first.id);
      setStartups([first]);
      setActiveStartupId(first.id);
      saveStartups([first]);
      saveActiveStartupId(first.id);
      return;
    }
    if (!activeStartupId || !startups.find((s) => s.id === activeStartupId)) {
      const first = startups[0];
      setActiveStartupId(first.id);
      saveActiveStartupId(first.id);
    }
  }, [startups, activeStartupId]);

  // Load layout for the active startup. If none stored, generate fresh AND
  // PERSIST IMMEDIATELY so the save effect doesn't race with a transient null.
  useEffect(() => {
    if (!activeStartupId) {
      setLayout(null);
      setFocusedId(null);
      return;
    }
    const stored = loadLayoutFor(activeStartupId);
    if (stored !== null) {
      setLayout(stored);
    } else {
      const fresh = generateId();
      saveLayoutFor(activeStartupId, fresh); // sync — prevents the null-race
      setLayout(fresh);
    }
    setFocusedId(null);
  }, [activeStartupId]);

  // Persist layout on changes. CRITICAL: skip when layout is null.
  // During activeStartupId transitions, layout is briefly null before the Load
  // effect's setLayout takes effect. Without this guard, the save effect would
  // remove the key (or write the previous startup's layout into the new key).
  useEffect(() => {
    if (!activeStartupId || layout === null) return;
    saveLayoutFor(activeStartupId, layout);
  }, [activeStartupId, layout]);

  // Initialize focus to the first pane in current layout.
  useEffect(() => {
    if (!focusedId && layout) {
      const ids = collectIds(layout);
      if (ids.length > 0) setFocusedId(ids[0]);
    }
  }, [focusedId, layout]);

  // ─── Startup ops ─────────────────────────────────────────────────────────
  // Synchronously seeds the new startup's layout BEFORE switching to it.
  // Prevents the same race as the Load effect's fresh-leaf path.
  const createStartup = (s: Startup) => {
    const next = [...startups, s];
    setStartups(next);
    saveStartups(next);

    const fresh = generateId();
    saveLayoutFor(s.id, fresh); // sync seed — no race possible

    setActiveStartupId(s.id);
    saveActiveStartupId(s.id);
  };

  const selectStartup = (id: string) => {
    if (id === activeStartupId) return;
    setActiveStartupId(id);
    saveActiveStartupId(id);
  };

  // ─── Context menu (right-click on a startup item) ─────────────────────────
  const openContextMenu = (id: string, x: number, y: number) => {
    setContextMenu({ id, x, y });
  };

  const closeContextMenu = () => setContextMenu(null);

  const renameStartup = (id: string) => {
    const startup = startups.find((s) => s.id === id);
    if (startup) {
      const next = window.prompt("New startup name:", startup.name);
      if (next && next.trim()) {
        const updated = startups.map((s) =>
          s.id === id ? { ...s, name: next.trim() } : s,
        );
        setStartups(updated);
        saveStartups(updated);
      }
    }
    closeContextMenu();
  };

  const changeStartupEmoji = (id: string) => {
    const startup = startups.find((s) => s.id === id);
    if (startup) {
      const next = window.prompt("New emoji (e.g. 🚀 💎 ⚡ 🔥):", startup.emoji);
      if (next && next.trim()) {
        const updated = startups.map((s) =>
          s.id === id ? { ...s, emoji: next.trim() } : s,
        );
        setStartups(updated);
        saveStartups(updated);
      }
    }
    closeContextMenu();
  };

  const deleteStartup = (id: string) => {
    const startup = startups.find((s) => s.id === id);
    if (!startup) {
      closeContextMenu();
      return;
    }
    if (
      !window.confirm(
        `Delete startup "${startup.name}"?\n\nThis destroys all its panes and tmux sessions permanently.`,
      )
    ) {
      closeContextMenu();
      return;
    }
    // Destroy all panes in this startup's stored layout
    const stored = loadLayoutFor(id);
    if (stored) {
      for (const paneId of collectIds(stored)) {
        void destroyTerminal(paneId);
      }
    }
    removeLayoutFor(id);
    const next = startups.filter((s) => s.id !== id);
    setStartups(next);
    saveStartups(next);
    // If the deleted one was active, switch focus
    if (id === activeStartupId) {
      if (next.length > 0) {
        setActiveStartupId(next[0].id);
        saveActiveStartupId(next[0].id);
      } else {
        // bootstrap effect will recreate a default startup
        setActiveStartupId(null);
        saveActiveStartupId(null);
      }
    }
    closeContextMenu();
  };

  // ─── Pane ops (operate on active startup's layout) ───────────────────────
  const splitFocused = (direction: "row" | "column") => {
    const newId = generateId();
    const target =
      focusedId ?? (layout && typeof layout === "string" ? layout : null);
    if (!layout || !target) {
      setLayout(newId);
      setFocusedId(newId);
      return;
    }
    setLayout(
      replaceLeaf(layout, target, { direction, first: target, second: newId }),
    );
    setFocusedId(newId);
  };

  const closeFocused = () => {
    if (!layout || !focusedId) return;
    const ids = collectIds(layout);
    const remaining = ids.filter((id) => id !== focusedId);
    void destroyTerminal(focusedId);
    if (remaining.length === 0) {
      const fresh = generateId();
      setLayout(fresh);
      setFocusedId(fresh);
      return;
    }
    setLayout(removeLeaf(layout, focusedId));
    setFocusedId(remaining[0]);
  };

  const resetLayout = () => {
    if (!layout || !activeStartupId) return;
    for (const id of collectIds(layout)) {
      void destroyTerminal(id);
    }
    removeLayoutFor(activeStartupId);
    const fresh = generateId();
    setLayout(fresh);
    setFocusedId(fresh);
  };

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      // Pane ops
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        if (e.shiftKey) splitFocused("column");
        else splitFocused("row");
        return;
      }
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        closeFocused();
        return;
      }

      // Startup switch by index: ⌘1..⌘9
      if (/^[1-9]$/.test(e.key) && !e.shiftKey) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < startups.length) {
          e.preventDefault();
          selectStartup(startups[idx].id);
        }
        return;
      }

      // Previous / next startup: ⌘⇧[ and ⌘⇧]
      // (macOS keyboard reports e.key as "{" / "}" when Shift is held)
      if (e.shiftKey && (e.key === "{" || e.key === "[")) {
        e.preventDefault();
        if (!activeStartupId || startups.length < 2) return;
        const i = startups.findIndex((s) => s.id === activeStartupId);
        const prev = startups[(i - 1 + startups.length) % startups.length];
        selectStartup(prev.id);
        return;
      }
      if (e.shiftKey && (e.key === "}" || e.key === "]")) {
        e.preventDefault();
        if (!activeStartupId || startups.length < 2) return;
        const i = startups.findIndex((s) => s.id === activeStartupId);
        const next = startups[(i + 1) % startups.length];
        selectStartup(next.id);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId, layout, startups, activeStartupId]);

  const activeStartup = startups.find((s) => s.id === activeStartupId) ?? null;
  const paneCount = layout ? collectIds(layout).length : 0;

  // Short label for pane header (4 trailing chars of the id, prefixed with startup emoji).
  const paneLabel = (id: string) => `${activeStartup?.emoji ?? "•"} ${id.slice(-4)}`;

  return (
    <div className="app">
      <Sidebar
        startups={startups}
        activeId={activeStartupId}
        onSelect={selectStartup}
        onCreate={createStartup}
        onContextMenu={openContextMenu}
      />
      <div className="main">
        <div className="toolbar">
          <div className="brand-block">
            <span className="brand-app">DalkkakAI</span>
            {activeStartup && (
              <>
                <span className="brand-divider">·</span>
                <span className="brand-startup">
                  <span className="brand-emoji">{activeStartup.emoji}</span>
                  <span className="brand-name">{activeStartup.name}</span>
                </span>
                <span className="brand-meta">
                  {paneCount} pane{paneCount !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>
          <div className="toolbar-actions">
            <button onClick={() => splitFocused("row")} title="Split focused pane horizontally (⌘D)">⇆ Split</button>
            <button onClick={() => splitFocused("column")} title="Stack focused pane vertically (⌘⇧D)">⇅ Stack</button>
            <button className="close" onClick={closeFocused} title="Close focused pane (⌘W)">✕ Close</button>
            <button onClick={resetLayout} title="Destroy all panes in this startup and start over">⟲ Reset</button>
          </div>
          <span className="hint">{focusedId ? <code>{focusedId.slice(-4)}</code> : "—"}</span>
        </div>
        <div className="mosaic-host">
          {layout && (
            <Mosaic<PaneId>
              renderTile={(id, path) => (
                <MosaicWindow<PaneId> path={path} title={paneLabel(id)} toolbarControls={<span />}>
                  <TerminalPane
                    id={id}
                    focused={id === focusedId}
                    onFocus={() => setFocusedId(id)}
                  />
                </MosaicWindow>
              )}
              value={layout}
              onChange={setLayout}
            />
          )}
        </div>
      </div>

      {showOnboarding && (
        <div className="onboarding-overlay" onClick={dismissOnboarding}>
          <div className="onboarding-card" onClick={(e) => e.stopPropagation()}>
            <h2>👋 Welcome to DalkkakAI</h2>
            <p>Native multi-pane terminal for running multiple startups in parallel.</p>
            <div className="onboarding-section">
              <div className="onboarding-label">Pane operations</div>
              <ul>
                <li><kbd>⌘D</kbd> split right</li>
                <li><kbd>⌘⇧D</kbd> stack below</li>
                <li><kbd>⌘W</kbd> close focused pane</li>
                <li>Click any pane → it gets focus (blue outline)</li>
              </ul>
            </div>
            <div className="onboarding-section">
              <div className="onboarding-label">Startup navigation</div>
              <ul>
                <li><kbd>⌘1</kbd>‥<kbd>⌘9</kbd> switch by sidebar index</li>
                <li><kbd>⌘⇧[</kbd> / <kbd>⌘⇧]</kbd> previous / next</li>
                <li>Right-click sidebar item → rename / change emoji / delete</li>
              </ul>
            </div>
            <div className="onboarding-section">
              <div className="onboarding-label">Inside the pane</div>
              <ul>
                <li>It's a real shell. Run <code>claude</code>, <code>codex</code>, <code>vim</code>, etc.</li>
                <li>Each pane is a separate tmux session — sessions survive app restarts.</li>
              </ul>
            </div>
            <button className="onboarding-dismiss" onClick={dismissOnboarding}>
              Got it — let me in
            </button>
            <div className="onboarding-foot">
              You can find all shortcuts later in <code>docs/SHORTCUTS.md</code>.
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <>
          <div className="context-menu-backdrop" onClick={closeContextMenu} />
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => renameStartup(contextMenu.id)}>
              <span>✏️</span> Rename
            </button>
            <button onClick={() => changeStartupEmoji(contextMenu.id)}>
              <span>🎨</span> Change emoji
            </button>
            <button className="danger" onClick={() => deleteStartup(contextMenu.id)}>
              <span>🗑</span> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

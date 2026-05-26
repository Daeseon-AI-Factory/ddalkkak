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
  pickDefaultEmoji,
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

function saveLayoutFor(startupId: string, layout: MosaicNode<PaneId> | null) {
  try {
    const key = layoutKeyFor(startupId);
    if (layout === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(layout));
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

// ─── Migration: old single-layout key → first startup's layout ─────────────
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

  // When active startup changes (or on first load), load that startup's layout.
  useEffect(() => {
    if (!activeStartupId) {
      setLayout(null);
      setFocusedId(null);
      return;
    }
    const restored = loadLayoutFor(activeStartupId) ?? generateId();
    setLayout(restored);
    setFocusedId(null); // will be auto-set by the next effect
  }, [activeStartupId]);

  // Persist layout under the active startup's key.
  useEffect(() => {
    if (!activeStartupId) return;
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
  const createStartup = (s: Startup) => {
    const next = [...startups, s];
    setStartups(next);
    saveStartups(next);
    setActiveStartupId(s.id);
    saveActiveStartupId(s.id);
  };

  const selectStartup = (id: string) => {
    if (id === activeStartupId) return;
    setActiveStartupId(id);
    saveActiveStartupId(id);
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
    if (!layout) return;
    for (const id of collectIds(layout)) {
      void destroyTerminal(id);
    }
    const fresh = generateId();
    setLayout(fresh);
    setFocusedId(fresh);
  };

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        if (e.shiftKey) splitFocused("column");
        else splitFocused("row");
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        closeFocused();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId, layout]);

  const activeStartup = startups.find((s) => s.id === activeStartupId) ?? null;

  return (
    <div className="app">
      <Sidebar
        startups={startups}
        activeId={activeStartupId}
        onSelect={selectStartup}
        onCreate={createStartup}
      />
      <div className="main">
        <div className="toolbar">
          <span className="brand">
            {activeStartup ? `${activeStartup.emoji} ${activeStartup.name}` : "DalkkakAI"}
          </span>
          <button onClick={() => splitFocused("row")} title="Split focused pane horizontally (⌘D)">⇆ Split</button>
          <button onClick={() => splitFocused("column")} title="Stack focused pane vertically (⌘⇧D)">⇅ Stack</button>
          <button className="close" onClick={closeFocused} title="Close focused pane (⌘W)">✕ Close</button>
          <button onClick={resetLayout} title="Destroy all panes in this startup and start over">⟲ Reset</button>
          <span className="hint">focus: <code>{focusedId ?? "—"}</code></span>
        </div>
        <div className="mosaic-host">
          {layout && (
            <Mosaic<PaneId>
              renderTile={(id, path) => (
                <MosaicWindow<PaneId> path={path} title={id} toolbarControls={<span />}>
                  <TerminalPane
                    id={id}
                    focused={id === focusedId}
                    onFocus={() => setFocusedId(id)}
                  />
                </MosaicWindow>
              )}
              value={layout}
              onChange={setLayout}
              createNode={generateId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

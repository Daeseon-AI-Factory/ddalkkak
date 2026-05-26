import { useEffect, useState } from "react";
import { Mosaic, MosaicWindow, type MosaicNode } from "react-mosaic-component";
import "react-mosaic-component/react-mosaic-component.css";
import { TerminalPane } from "./TerminalPane";
import { destroyTerminal } from "./terminalRegistry";
import "./App.css";

type PaneId = string;

const generateId = (): PaneId =>
  `pane-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

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

export default function App() {
  const [layout, setLayout] = useState<MosaicNode<PaneId> | null>(() => generateId());
  const [focusedId, setFocusedId] = useState<PaneId | null>(null);

  // Initialize focus to the first pane on mount.
  useEffect(() => {
    if (!focusedId && layout) {
      const ids = collectIds(layout);
      if (ids.length > 0) setFocusedId(ids[0]);
    }
  }, [focusedId, layout]);

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
    setFocusedId(newId); // new pane gets focus (matches iTerm/VS Code)
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
    for (const id of collectIds(layout)) {
      void destroyTerminal(id);
    }
    const fresh = generateId();
    setLayout(fresh);
    setFocusedId(fresh);
  };

  // Keyboard shortcuts — window-level capture so xterm doesn't swallow them.
  // Cmd+D (or Ctrl+D on Linux/Win) — split right
  // Cmd+Shift+D — stack below
  // Cmd+W — close focused
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

  return (
    <div className="app">
      <div className="toolbar">
        <span className="brand">DalkkakAI</span>
        <button onClick={() => splitFocused("row")} title="Split focused pane horizontally (⌘D)">⇆ Split</button>
        <button onClick={() => splitFocused("column")} title="Stack focused pane vertically (⌘⇧D)">⇅ Stack</button>
        <button className="close" onClick={closeFocused} title="Close focused pane (⌘W)">✕ Close</button>
        <button onClick={resetLayout} title="Destroy all panes and start over">⟲ Reset</button>
        <span className="hint">focus: <code>{focusedId ?? "—"}</code></span>
      </div>
      <div className="mosaic-host">
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
      </div>
    </div>
  );
}

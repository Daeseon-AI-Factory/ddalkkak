import { useState } from "react";
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

export default function App() {
  const [layout, setLayout] = useState<MosaicNode<PaneId> | null>(() => generateId());

  const addPaneRow = () => {
    const newId = generateId();
    setLayout((prev) => (prev ? { direction: "row", first: prev, second: newId } : newId));
  };

  const addPaneColumn = () => {
    const newId = generateId();
    setLayout((prev) => (prev ? { direction: "column", first: prev, second: newId } : newId));
  };

  const resetLayout = () => {
    // Explicit destruction — only happens on Reset, not on every split.
    for (const id of collectIds(layout)) {
      void destroyTerminal(id);
    }
    setLayout(generateId());
  };

  return (
    <div className="app">
      <div className="toolbar">
        <span className="brand">DalkkakAI</span>
        <button onClick={addPaneRow} title="Split horizontally (add pane to the right)">⇆ Split</button>
        <button onClick={addPaneColumn} title="Split vertically (add pane below)">⇅ Stack</button>
        <button onClick={resetLayout} title="Destroy all panes and start over">⟲ Reset</button>
      </div>
      <div className="mosaic-host">
        <Mosaic<PaneId>
          renderTile={(id, path) => (
            <MosaicWindow<PaneId> path={path} title={id} toolbarControls={<span />}>
              <TerminalPane id={id} />
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

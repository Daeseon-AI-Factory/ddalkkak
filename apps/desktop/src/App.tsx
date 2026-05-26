import { useState } from "react";
import { Mosaic, MosaicWindow, type MosaicNode } from "react-mosaic-component";
import "react-mosaic-component/react-mosaic-component.css";
import { TerminalPane } from "./TerminalPane";
import "./App.css";

type PaneId = string;

// Robust ID generation — timestamp + random suffix. Avoids collisions across
// React strict-mode double-invokes and rapid clicks. Counter approaches are
// footguns in concurrent rendering.
const generateId = (): PaneId =>
  `pane-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

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
    setLayout(generateId());
  };

  return (
    <div className="app">
      <div className="toolbar">
        <span className="brand">DalkkakAI</span>
        <button onClick={addPaneRow} title="Split horizontally (add pane to the right)">⇆ Split</button>
        <button onClick={addPaneColumn} title="Split vertically (add pane below)">⇅ Stack</button>
        <button onClick={resetLayout} title="Reset to single pane">⟲ Reset</button>
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

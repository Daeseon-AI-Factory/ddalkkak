import { useState, useRef } from "react";
import { Mosaic, MosaicWindow, type MosaicNode } from "react-mosaic-component";
import "react-mosaic-component/react-mosaic-component.css";
import { TerminalPane } from "./TerminalPane";
import "./App.css";

type PaneId = string;

export default function App() {
  const [layout, setLayout] = useState<MosaicNode<PaneId> | null>("pane-1");
  const nextIdRef = useRef(2);

  const addPaneRow = () => {
    const newId = `pane-${nextIdRef.current++}`;
    setLayout((prev) => (prev ? { direction: "row", first: prev, second: newId } : newId));
  };

  const addPaneColumn = () => {
    const newId = `pane-${nextIdRef.current++}`;
    setLayout((prev) => (prev ? { direction: "column", first: prev, second: newId } : newId));
  };

  const resetLayout = () => {
    nextIdRef.current = 2;
    setLayout("pane-1");
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
        />
      </div>
    </div>
  );
}

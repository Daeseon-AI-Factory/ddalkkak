import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ensureSpawned, getOrCreateTerminal } from "./terminalRegistry";
import "@xterm/xterm/css/xterm.css";

interface Props {
  id: string;
  focused: boolean;
  onFocus: () => void;
}

export function TerminalPane({ id, focused, onFocus }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const entry = getOrCreateTerminal(id);
    const { term, fit } = entry;
    const container = containerRef.current;

    if (term.element) {
      container.appendChild(term.element);
    } else {
      term.open(container);
    }

    const fitAndSpawn = () => {
      try { fit.fit(); } catch { /* not ready */ }
      void ensureSpawned(id, term.cols, term.rows);
    };
    queueMicrotask(fitAndSpawn);

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
        void invoke("pty_resize", { id, cols: term.cols, rows: term.rows });
      } catch { /* not ready */ }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
    };
  }, [id]);

  // When focused, hand keyboard control to xterm so typing goes to the PTY.
  useEffect(() => {
    if (!focused) return;
    const entry = getOrCreateTerminal(id);
    queueMicrotask(() => entry.term.focus());
  }, [focused, id]);

  return (
    <div
      ref={containerRef}
      className={`terminal-host ${focused ? "focused" : ""}`}
      onMouseDown={onFocus}
    />
  );
}

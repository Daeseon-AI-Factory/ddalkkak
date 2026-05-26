import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ensureSpawned, getOrCreateTerminal } from "./terminalRegistry";
import "@xterm/xterm/css/xterm.css";

interface Props {
  id: string;
}

export function TerminalPane({ id }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const entry = getOrCreateTerminal(id);
    const { term, fit } = entry;
    const container = containerRef.current;

    // (Re)attach the terminal's DOM to this container.
    //   - First mount of `id`: term.element is undefined → term.open(container)
    //     creates the internal DOM under `container`.
    //   - Remount (Mosaic split caused unmount/remount): term.element exists
    //     in a previous orphaned parent. Move it to the new container.
    //     This preserves all internal xterm state (buffer, cursor, scroll).
    if (term.element) {
      container.appendChild(term.element);
    } else {
      term.open(container);
    }

    // Defer fit + spawn one tick so the container has measured layout.
    const fitAndSpawn = () => {
      try {
        fit.fit();
      } catch {
        /* not ready on very first call */
      }
      void ensureSpawned(id, term.cols, term.rows);
    };
    queueMicrotask(fitAndSpawn);

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
        void invoke("pty_resize", { id, cols: term.cols, rows: term.rows });
      } catch {
        /* not ready */
      }
    });
    ro.observe(container);

    return () => {
      // CRITICAL: do NOT call pty_kill or term.dispose here.
      // Cleanup runs on Mosaic-induced remounts (layout path changes); the
      // underlying xterm + PTY must survive. The terminal element will be
      // re-attached on the next mount via the appendChild branch above.
      // Explicit destruction happens via destroyTerminal() from user actions.
      ro.disconnect();
    };
  }, [id]);

  return <div ref={containerRef} className="terminal-host" />;
}

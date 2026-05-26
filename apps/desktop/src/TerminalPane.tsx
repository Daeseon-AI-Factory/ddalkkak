import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface Props {
  id: string;
}

interface PtyOutputEvent {
  id: string;
  data: string;
}

export function TerminalPane({ id }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Menlo, "JetBrains Mono", "SF Mono", monospace',
      fontSize: 13,
      theme: { background: "#0f172a", foreground: "#e2e8f0" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    let unlisten: UnlistenFn | undefined;
    let resizeObserver: ResizeObserver | undefined;

    (async () => {
      unlisten = await listen<PtyOutputEvent>("pty-output", (event) => {
        if (event.payload.id === id) {
          term.write(event.payload.data);
        }
      });

      await invoke("pty_spawn", { id, cols: term.cols, rows: term.rows });

      term.onData((data) => {
        invoke("pty_write", { id, input: data }).catch(console.error);
      });
    })();

    const doResize = () => {
      try {
        fit.fit();
        invoke("pty_resize", { id, cols: term.cols, rows: term.rows }).catch(console.error);
      } catch {
        /* xterm may not be ready on first call */
      }
    };

    // ResizeObserver per pane is required since each mosaic tile is independently sized.
    resizeObserver = new ResizeObserver(doResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (unlisten) unlisten();
      invoke("pty_kill", { id }).catch(() => {});
      term.dispose();
    };
  }, [id]);

  return <div ref={containerRef} className="terminal-host" />;
}

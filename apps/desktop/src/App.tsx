import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import "./App.css";

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

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

    termRef.current = term;
    fitRef.current = fit;

    let unlisten: UnlistenFn | undefined;
    let killed = false;

    (async () => {
      unlisten = await listen<string>("pty-output", (event) => {
        term.write(event.payload);
      });

      await invoke("pty_spawn", { cols: term.cols, rows: term.rows });

      term.onData((data) => {
        invoke("pty_write", { input: data }).catch(console.error);
      });
    })();

    const handleResize = () => {
      fit.fit();
      invoke("pty_resize", { cols: term.cols, rows: term.rows }).catch(console.error);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      killed = true;
      window.removeEventListener("resize", handleResize);
      if (unlisten) unlisten();
      invoke("pty_kill").catch(() => {});
      term.dispose();
    };
  }, []);

  return <div ref={containerRef} className="terminal-host" />;
}

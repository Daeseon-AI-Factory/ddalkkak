//! Visual design tokens — the consistency layer shared by every viz_kind renderer.
//!
//! This is the real source of a polished, "looks-like-one-product" feel (the lesson
//! from ByteByteGo: the magic is a consistent visual system, not any single library).
//! Every renderer pulls color/spacing/radius from here so they cohere. Palette is the
//! GitHub-dark family viz-core also used, so our cards sit naturally on the terminal UI.

export const c = {
  bg: "#0d1117",
  panel: "#161b22",
  border: "#30363d",
  text: "#e6edf3",
  muted: "#8b949e",
  dim: "#6e7681",
  accent: "#58a6ff", // blue — identity / headings
  good: "#3fb950", // green — "with" / pros / success
  bad: "#f85149", // red — "without" / cons / error
  warn: "#d29922", // amber — analogy / caution
} as const;

export const radius = { sm: 8, md: 12, pill: 999 } as const;

/** 4px base spacing scale. space(4) === 16px. */
export const space = (n: number): number => n * 4;

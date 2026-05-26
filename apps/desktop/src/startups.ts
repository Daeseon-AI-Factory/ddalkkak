//! Startup model + storage.
//!
//! Each startup is a logical workspace — its own pane layout, its own running
//! Claude/codex sessions (via tmux), its own visual identity. The sidebar lets
//! the user run several startups in parallel and switch between them.

const STARTUPS_KEY = "dalkkak.startups.v1";
const ACTIVE_STARTUP_KEY = "dalkkak.activeStartupId.v1";

export interface Startup {
  id: string;
  name: string;
  emoji: string;
  createdAt: number;
}

export function generateStartupId(): string {
  return `startup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const DEFAULT_EMOJIS = ["🚀", "💎", "⚡", "🔥", "🌱", "🎯", "🦄", "🍀", "🌊", "🎨", "🛠️", "📦", "🧪", "🎮"];

export function pickDefaultEmoji(): string {
  return DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)];
}

export function loadStartups(): Startup[] {
  try {
    const raw = localStorage.getItem(STARTUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStartups(list: Startup[]) {
  try {
    localStorage.setItem(STARTUPS_KEY, JSON.stringify(list));
  } catch {
    /* best-effort */
  }
}

export function loadActiveStartupId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_STARTUP_KEY);
  } catch {
    return null;
  }
}

export function saveActiveStartupId(id: string | null) {
  try {
    if (id === null) localStorage.removeItem(ACTIVE_STARTUP_KEY);
    else localStorage.setItem(ACTIVE_STARTUP_KEY, id);
  } catch {
    /* best-effort */
  }
}

/** localStorage key for a startup's pane layout tree. */
export function layoutKeyFor(startupId: string): string {
  return `dalkkak.layout.${startupId}.v1`;
}

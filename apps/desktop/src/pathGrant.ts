//! Folder-picker grant flow. The ONLY way a project path enters the Rust
//! allowlist. See docs/CONNECTIVE_LAYER.md.

import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import type { PathGrant } from "./startups";

/**
 * Ask the user to pick a project folder for a startup, then register it with the
 * Rust path-allowlist chokepoint (which canonicalizes + symlink-resolves it).
 * Returns the grant to persist on the startup, or null if the user cancelled.
 */
export async function grantPathFor(startupId: string): Promise<PathGrant | null> {
  const picked = await open({
    directory: true,
    multiple: false,
    title: "Grant DalkkakAI access to this project folder",
  });
  if (typeof picked !== "string") return null; // cancelled

  const canonicalPath = await invoke<string>("grant_project_path", {
    startupId,
    requestedPath: picked,
  });
  return { requestedPath: picked, canonicalPath, grantedAt: Date.now() };
}

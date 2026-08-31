import { invoke } from "@tauri-apps/api/core";

export function hideCompactPanel(): Promise<void> {
  return invoke("hide_compact_panel");
}

export function openFullView(): Promise<void> {
  return invoke("open_full_view");
}

export function quitApp(): Promise<void> {
  return invoke("quit_app");
}

export function currentWindowIsVisible(): Promise<boolean> {
  return invoke("current_window_is_visible");
}

import { useEffect, useRef, type RefObject } from "react";

const IS_MAC = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);

/** Primary shortcut modifier name in `aria-keyshortcuts` form. */
export const SHORTCUT_MODIFIER = IS_MAC ? "Meta" : "Control";

const ROW_ACTIONS = "button.terminate-button:not(:disabled)";

/**
 * Window-level keyboard support shared by both views:
 * Cmd/Ctrl+F focuses search, Cmd/Ctrl+R refreshes, and Up/Down move between
 * search and the row actions. Dialogs stop propagation, so none of this runs
 * while a dialog handles the key.
 */
export function useKeyboardNavigation(
  searchRef: RefObject<HTMLInputElement | null>,
  refresh: () => unknown,
  pendingPid?: number,
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = IS_MAC ? event.metaKey : event.ctrlKey;
      if (modifier && !event.altKey && !event.shiftKey) {
        const key = event.key.toLowerCase();
        if (key === "f") {
          event.preventDefault();
          searchRef.current?.focus();
          searchRef.current?.select();
        } else if (key === "r") {
          // Also stops the webview from reloading and discarding view state.
          event.preventDefault();
          void refresh();
        }
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const stops = [searchRef.current, ...document.querySelectorAll<HTMLElement>(ROW_ACTIONS)]
        .filter((element): element is HTMLElement => Boolean(element));
      const index = stops.indexOf(document.activeElement as HTMLElement);
      if (index === -1) return;
      const next = stops[index + (event.key === "ArrowDown" ? 1 : -1)];
      if (!next) return;
      event.preventDefault();
      next.focus();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [refresh, searchRef]);

  // A finished termination removes the focused row button; return focus to search instead of losing it.
  const wasPending = useRef(false);
  useEffect(() => {
    const focusLost = !document.activeElement || document.activeElement === document.body;
    if (wasPending.current && pendingPid === undefined && focusLost) searchRef.current?.focus();
    wasPending.current = pendingPid !== undefined;
  }, [pendingPid, searchRef]);
}

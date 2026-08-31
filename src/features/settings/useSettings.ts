import { useSyncExternalStore } from "react";
import { settingsStore } from "./store";

export function useSettings() {
  const snapshot = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    settingsStore.getSnapshot,
  );

  return {
    ...snapshot,
    setTheme: (theme: typeof snapshot.settings.theme) => settingsStore.update({ theme }),
    setRefreshInterval: (refreshInterval: typeof snapshot.settings.refreshInterval) =>
      settingsStore.update({ refreshInterval }),
    clearPersistenceError: settingsStore.clearError,
  };
}

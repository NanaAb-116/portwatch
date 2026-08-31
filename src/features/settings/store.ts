import { normalizeSettings, type AppSettings } from "./model";
import {
  LocalSettingsRepository,
  SETTINGS_STORAGE_KEY,
  type SettingsRepository,
} from "./repository";

export type SettingsSnapshot = {
  settings: AppSettings;
  persistenceError?: string;
};

type StorageEventSource = Pick<Window, "addEventListener" | "removeEventListener">;

export type SettingsStore = ReturnType<typeof createSettingsStore>;

export function createSettingsStore(
  repository: SettingsRepository,
  eventSource?: StorageEventSource,
) {
  const loaded = repository.load();
  let snapshot: SettingsSnapshot = {
    settings: loaded.settings,
    persistenceError: loaded.error,
  };
  const subscribers = new Set<() => void>();

  const publish = (next: SettingsSnapshot) => {
    snapshot = next;
    subscribers.forEach((subscriber) => subscriber());
  };

  const handleStorage = (event: Event) => {
    const storageEvent = event as StorageEvent;
    if (storageEvent.key !== SETTINGS_STORAGE_KEY && storageEvent.key !== null) return;
    const next = repository.load();
    publish({ settings: next.settings, persistenceError: next.error });
  };

  eventSource?.addEventListener("storage", handleStorage);

  return {
    getSnapshot: () => snapshot,
    subscribe(subscriber: () => void) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
    update(patch: Partial<Pick<AppSettings, "theme" | "refreshInterval">>): boolean {
      const nextSettings = normalizeSettings({ ...snapshot.settings, ...patch });
      try {
        repository.save(nextSettings);
        publish({ settings: nextSettings });
        return true;
      } catch {
        publish({
          settings: snapshot.settings,
          persistenceError: "PortWatch could not save that setting. Your previous choice is still active.",
        });
        return false;
      }
    },
    clearError() {
      if (snapshot.persistenceError) publish({ settings: snapshot.settings });
    },
    dispose() {
      eventSource?.removeEventListener("storage", handleStorage);
      subscribers.clear();
    },
  };
}

export const settingsStore = createSettingsStore(
  new LocalSettingsRepository(window.localStorage),
  window,
);

import { DEFAULT_SETTINGS, normalizeSettings, type AppSettings } from "./model";

export const SETTINGS_STORAGE_KEY = "dev.portwatch.desktop.settings.v1";

export type SettingsLoadResult = {
  settings: AppSettings;
  error?: string;
};

export interface SettingsRepository {
  load(): SettingsLoadResult;
  save(settings: AppSettings): void;
}

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class LocalSettingsRepository implements SettingsRepository {
  constructor(private readonly storage: SettingsStorage) {}

  load(): SettingsLoadResult {
    let stored: string | null;
    try {
      stored = this.storage.getItem(SETTINGS_STORAGE_KEY);
    } catch {
      return {
        settings: { ...DEFAULT_SETTINGS },
        error: "PortWatch could not read saved settings. Defaults are being used.",
      };
    }

    if (stored === null) return { settings: { ...DEFAULT_SETTINGS } };

    try {
      return { settings: normalizeSettings(JSON.parse(stored)) };
    } catch {
      const settings = { ...DEFAULT_SETTINGS };
      try {
        this.save(settings);
      } catch {
        // Recovery still succeeds in memory when storage cannot be repaired.
      }
      return {
        settings,
        error: "Saved settings were invalid and have been reset to defaults.",
      };
    }
  }

  save(settings: AppSettings): void {
    this.storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
}

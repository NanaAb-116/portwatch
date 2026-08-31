import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "./model";
import {
  LocalSettingsRepository,
  SETTINGS_STORAGE_KEY,
  type SettingsStorage,
} from "./repository";

function memoryStorage(initial?: string): SettingsStorage & { value: string | null } {
  return {
    value: initial ?? null,
    getItem() {
      return this.value;
    },
    setItem(_key, value) {
      this.value = value;
    },
  };
}

describe("local settings repository", () => {
  it("loads defaults when settings are missing", () => {
    expect(new LocalSettingsRepository(memoryStorage()).load()).toEqual({
      settings: DEFAULT_SETTINGS,
    });
  });

  it("loads persisted and partial settings", () => {
    const complete = memoryStorage(JSON.stringify({ version: 1, theme: "light", refreshInterval: "30s" }));
    expect(new LocalSettingsRepository(complete).load().settings).toEqual({
      version: 1,
      theme: "light",
      refreshInterval: "30s",
    });

    const partial = memoryStorage(JSON.stringify({ refreshInterval: "5s" }));
    expect(new LocalSettingsRepository(partial).load().settings).toEqual({
      version: 1,
      theme: "system",
      refreshInterval: "5s",
    });
  });

  it("repairs corrupt JSON with defaults", () => {
    const storage = memoryStorage("not-json");
    const result = new LocalSettingsRepository(storage).load();
    expect(result.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.error).toContain("reset to defaults");
    expect(storage.value).toBe(JSON.stringify(DEFAULT_SETTINGS));
  });

  it("recovers from read failures without leaking the storage error", () => {
    const storage: SettingsStorage = {
      getItem: vi.fn(() => { throw new Error("private storage path"); }),
      setItem: vi.fn(),
    };
    const result = new LocalSettingsRepository(storage).load();
    expect(result.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.error).not.toContain("private storage path");
  });

  it("persists updates under the PortWatch-scoped key", () => {
    const storage = memoryStorage();
    new LocalSettingsRepository(storage).save({ version: 1, theme: "dark", refreshInterval: "60s" });
    expect(storage.value).toBe(JSON.stringify({ version: 1, theme: "dark", refreshInterval: "60s" }));
    expect(SETTINGS_STORAGE_KEY).toContain("portwatch");
  });
});

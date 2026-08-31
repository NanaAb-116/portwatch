import { describe, expect, it, vi } from "vitest";
import type { AppSettings } from "./model";
import { SETTINGS_STORAGE_KEY, type SettingsRepository } from "./repository";
import { createSettingsStore } from "./store";

function repository(initial: AppSettings): SettingsRepository & { current: AppSettings } {
  return {
    current: initial,
    load() { return { settings: this.current }; },
    save(settings) { this.current = settings; },
  };
}

describe("settings store", () => {
  const defaults: AppSettings = { version: 1, theme: "system", refreshInterval: "off" };

  it("publishes and persists updates", () => {
    const data = repository(defaults);
    const store = createSettingsStore(data);
    const subscriber = vi.fn();
    store.subscribe(subscriber);

    expect(store.update({ theme: "dark" })).toBe(true);
    expect(store.getSnapshot().settings.theme).toBe("dark");
    expect(data.current.theme).toBe("dark");
    expect(subscriber).toHaveBeenCalledOnce();
  });

  it("keeps the active value and surfaces failed persistence", () => {
    const data = repository(defaults);
    data.save = vi.fn(() => { throw new Error("disk details"); });
    const store = createSettingsStore(data);

    expect(store.update({ refreshInterval: "5s" })).toBe(false);
    expect(store.getSnapshot().settings.refreshInterval).toBe("off");
    expect(store.getSnapshot().persistenceError).toContain("could not save");
    expect(store.getSnapshot().persistenceError).not.toContain("disk details");
  });

  it("synchronizes from an external window storage event", () => {
    const data = repository(defaults);
    const events = new EventTarget();
    const store = createSettingsStore(data, events as unknown as Window);
    data.current = { ...defaults, theme: "light", refreshInterval: "10s" };

    const event = new Event("storage");
    Object.defineProperty(event, "key", { value: SETTINGS_STORAGE_KEY });
    events.dispatchEvent(event);

    expect(store.getSnapshot().settings).toEqual(data.current);
    store.dispose();
  });
});

import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  refreshIntervalMilliseconds,
} from "./model";

describe("settings model", () => {
  it("defines safe explicit defaults", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      version: 1,
      theme: "system",
      refreshInterval: "off",
    });
    expect(refreshIntervalMilliseconds("off")).toBeUndefined();
  });

  it("merges partial stored settings with defaults", () => {
    expect(normalizeSettings({ theme: "dark" })).toEqual({
      version: 1,
      theme: "dark",
      refreshInterval: "off",
    });
  });

  it("rejects invalid fields without discarding valid fields", () => {
    expect(normalizeSettings({ theme: "neon", refreshInterval: "10s" })).toEqual({
      version: 1,
      theme: "system",
      refreshInterval: "10s",
    });
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it.each([
    ["5s", 5_000],
    ["10s", 10_000],
    ["30s", 30_000],
    ["60s", 60_000],
  ] as const)("maps %s without leaking magic numbers to consumers", (interval, milliseconds) => {
    expect(refreshIntervalMilliseconds(interval)).toBe(milliseconds);
  });
});

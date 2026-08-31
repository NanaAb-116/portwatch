export type ThemePreference = "system" | "light" | "dark";
export type RefreshInterval = "off" | "5s" | "10s" | "30s" | "60s";

export type AppSettings = {
  version: 1;
  theme: ThemePreference;
  refreshInterval: RefreshInterval;
};

export const DEFAULT_SETTINGS: AppSettings = Object.freeze({
  version: 1,
  theme: "system",
  refreshInterval: "off",
});

export const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const REFRESH_INTERVAL_OPTIONS: ReadonlyArray<{
  value: RefreshInterval;
  label: string;
}> = [
  { value: "off", label: "Off" },
  { value: "5s", label: "5 seconds" },
  { value: "10s", label: "10 seconds" },
  { value: "30s", label: "30 seconds" },
  { value: "60s", label: "60 seconds" },
];

const themes = new Set<ThemePreference>(THEME_OPTIONS.map(({ value }) => value));
const refreshIntervals = new Set<RefreshInterval>(
  REFRESH_INTERVAL_OPTIONS.map(({ value }) => value),
);

export function normalizeSettings(value: unknown): AppSettings {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS };

  return {
    version: 1,
    theme: themes.has(value.theme as ThemePreference)
      ? (value.theme as ThemePreference)
      : DEFAULT_SETTINGS.theme,
    refreshInterval: refreshIntervals.has(value.refreshInterval as RefreshInterval)
      ? (value.refreshInterval as RefreshInterval)
      : DEFAULT_SETTINGS.refreshInterval,
  };
}

export function refreshIntervalMilliseconds(value: RefreshInterval): number | undefined {
  switch (value) {
    case "off":
      return undefined;
    case "5s":
      return 5_000;
    case "10s":
      return 10_000;
    case "30s":
      return 30_000;
    case "60s":
      return 60_000;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

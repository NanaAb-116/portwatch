import type { ThemePreference } from "./model";

export type EffectiveTheme = "light" | "dark";

export function resolveTheme(
  preference: ThemePreference,
  systemTheme: EffectiveTheme,
): EffectiveTheme {
  return preference === "system" ? systemTheme : preference;
}

export function applyTheme(theme: EffectiveTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

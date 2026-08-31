import { useEffect, useState } from "react";
import { useSettings } from "./useSettings";
import { applyTheme, resolveTheme, type EffectiveTheme } from "./theme";

export function ThemeController() {
  const { settings } = useSettings();
  const [systemTheme, setSystemTheme] = useState<EffectiveTheme>(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", handleChange);
    setSystemTheme(media.matches ? "dark" : "light");
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    applyTheme(resolveTheme(settings.theme, systemTheme));
  }, [settings.theme, systemTheme]);

  return null;
}

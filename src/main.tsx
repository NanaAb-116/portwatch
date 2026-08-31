import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { applyTheme, resolveTheme } from "./features/settings/theme";
import { settingsStore } from "./features/settings/store";

const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
applyTheme(resolveTheme(settingsStore.getSnapshot().settings.theme, systemTheme));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

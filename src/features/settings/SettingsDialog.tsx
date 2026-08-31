import { useEffect, useRef, type KeyboardEvent } from "react";
import { REFRESH_INTERVAL_OPTIONS, THEME_OPTIONS } from "./model";
import { useSettings } from "./useSettings";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const {
    settings,
    persistenceError,
    setTheme,
    setRefreshInterval,
    clearPersistenceError,
  } = useSettings();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled)',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="dialog-backdrop settings-backdrop">
      <div
        ref={dialogRef}
        className="dialog settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onKeyDown={handleKeyDown}
      >
        <div className="settings-heading">
          <div>
            <h2 id="settings-title">Settings</h2>
            <p>Personalize how PortWatch looks and refreshes.</p>
          </div>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label="Close settings">×</button>
        </div>

        {persistenceError ? (
          <div className="error-banner settings-error" role="alert">
            {persistenceError}
            <button type="button" onClick={clearPersistenceError}>Dismiss</button>
          </div>
        ) : null}

        <fieldset className="settings-section">
          <legend>Appearance</legend>
          <span className="settings-label">Theme</span>
          <div className="choice-group">
            {THEME_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`choice-card${settings.theme === option.value ? " choice-card--selected" : ""}`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={settings.theme === option.value}
                  onChange={() => setTheme(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <p className="settings-help">System follows appearance changes from your operating system.</p>
        </fieldset>

        <fieldset className="settings-section">
          <legend>Refresh</legend>
          <span className="settings-label">Automatic refresh</span>
          <div className="choice-list">
            {REFRESH_INTERVAL_OPTIONS.map((option) => (
              <label key={option.value} className="choice-row">
                <span>{option.label}</span>
                <input
                  type="radio"
                  name="refresh-interval"
                  value={option.value}
                  checked={settings.refreshInterval === option.value}
                  onChange={() => setRefreshInterval(option.value)}
                />
              </label>
            ))}
          </div>
          <p className="settings-help">Visible PortWatch windows refresh independently. Manual refresh always remains available.</p>
        </fieldset>

      </div>
    </div>
  );
}

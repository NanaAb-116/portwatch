use tauri::AppHandle;

use crate::{desktop, errors::PortWatchError};

#[tauri::command]
pub fn hide_compact_panel(app: AppHandle) -> Result<(), PortWatchError> {
    desktop::hide_window(&app, desktop::COMPACT_WINDOW_LABEL)
}

#[tauri::command]
pub fn open_full_view(app: AppHandle) -> Result<(), PortWatchError> {
    desktop::open_full_view(&app)
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn current_window_is_visible(window: tauri::WebviewWindow) -> Result<bool, PortWatchError> {
    if !desktop::is_managed_window_label(window.label()) {
        return Err(PortWatchError::DesktopOperationFailed {
            operation: "invalid_window_label".into(),
        });
    }
    window
        .is_visible()
        .map_err(|_| PortWatchError::DesktopOperationFailed {
            operation: "read_window_visibility".into(),
        })
}

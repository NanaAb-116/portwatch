mod lifecycle;
#[cfg(target_os = "macos")]
mod macos;
mod positioning;

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, PhysicalRect, WindowEvent, Wry,
};

use crate::errors::PortWatchError;

use lifecycle::{
    decide, presentation_actions, LifecycleAction, LifecycleEvent, WindowPresentationAction,
};
pub use lifecycle::{is_managed_window_label, COMPACT_WINDOW_LABEL, FULL_WINDOW_LABEL};

const REFRESH_EVENT: &str = "portwatch://refresh-requested";
const VISIBILITY_EVENT: &str = "portwatch://window-visibility-changed";
const MENU_SHOW_PANEL: &str = "show-panel";
const MENU_OPEN_FULL: &str = "open-full";
const MENU_REFRESH: &str = "refresh";
const MENU_QUIT: &str = "quit";

pub fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "macos")]
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);

    let show_panel =
        MenuItemBuilder::with_id(MENU_SHOW_PANEL, "Show PortWatch Panel").build(app)?;
    let open_full = MenuItemBuilder::with_id(MENU_OPEN_FULL, "Open PortWatch").build(app)?;
    let refresh = MenuItemBuilder::with_id(MENU_REFRESH, "Refresh").build(app)?;
    let quit = MenuItemBuilder::with_id(MENU_QUIT, "Quit PortWatch").build(app)?;
    let menu = MenuBuilder::new(app)
        .items(&[&show_panel, &open_full, &refresh])
        .separator()
        .item(&quit)
        .build()?;

    let tray = TrayIconBuilder::with_id("portwatch-tray")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("PortWatch")
        .icon(app.default_window_icon().expect("application icon").clone());

    tray.on_tray_icon_event(|tray, event| {
        if let TrayIconEvent::Click {
            rect,
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } = event
        {
            toggle_compact_panel(tray.app_handle(), Some(rect));
        }
    })
    .on_menu_event(|app, event| match event.id().as_ref() {
        MENU_SHOW_PANEL => show_compact_panel(app, None),
        MENU_OPEN_FULL => {
            let _ = open_full_view(app);
        }
        MENU_REFRESH => apply_lifecycle(app, LifecycleEvent::TrayRefresh, None),
        MENU_QUIT => apply_lifecycle(app, LifecycleEvent::ExplicitQuit, None),
        _ => {}
    })
    .build(app)?;

    Ok(())
}

pub fn handle_window_event(window: &tauri::Window<Wry>, event: &WindowEvent) {
    match event {
        WindowEvent::CloseRequested { api, .. }
            if lifecycle::is_managed_window_label(window.label()) =>
        {
            for action in decide(LifecycleEvent::WindowCloseRequested {
                label: if window.label() == COMPACT_WINDOW_LABEL {
                    COMPACT_WINDOW_LABEL
                } else {
                    FULL_WINDOW_LABEL
                },
            }) {
                match action {
                    LifecycleAction::PreventClose => api.prevent_close(),
                    LifecycleAction::HideWindow(_) => {
                        hide_native_window(window);
                    }
                    _ => {}
                }
            }
        }
        WindowEvent::Focused(false) if window.label() == COMPACT_WINDOW_LABEL => {
            for action in decide(LifecycleEvent::CompactFocusChanged { focused: false }) {
                if action == LifecycleAction::HideCompact {
                    hide_native_window(window);
                }
            }
        }
        _ => {}
    }
}

pub fn open_full_view(app: &AppHandle) -> Result<(), PortWatchError> {
    for action in decide(LifecycleEvent::OpenFullView) {
        match action {
            LifecycleAction::HideCompact => hide_window(app, COMPACT_WINDOW_LABEL)?,
            LifecycleAction::ShowFull => show_window(app, FULL_WINDOW_LABEL)?,
            _ => {}
        }
    }
    Ok(())
}

pub fn hide_window(app: &AppHandle, label: &str) -> Result<(), PortWatchError> {
    let window = managed_window(app, label)?;
    window.hide().map_err(|_| desktop_error("hide_window"))?;
    window
        .emit(VISIBILITY_EVENT, false)
        .map_err(|_| desktop_error("report_window_visibility"))
}

fn hide_native_window(window: &tauri::Window<Wry>) {
    if window.hide().is_ok() {
        let _ = window.emit(VISIBILITY_EVENT, false);
    }
}

fn toggle_compact_panel(app: &AppHandle, tray_rect: Option<tauri::Rect>) {
    let Ok(window) = managed_window(app, COMPACT_WINDOW_LABEL) else {
        return;
    };
    let visible = window.is_visible().unwrap_or(false);
    apply_lifecycle(
        app,
        LifecycleEvent::TrayActivated {
            compact_visible: visible,
        },
        tray_rect,
    );
}

fn apply_lifecycle(app: &AppHandle, event: LifecycleEvent, tray_rect: Option<tauri::Rect>) {
    for action in decide(event) {
        match action {
            LifecycleAction::ShowCompact => show_compact_panel(app, tray_rect),
            LifecycleAction::HideCompact => {
                let _ = hide_window(app, COMPACT_WINDOW_LABEL);
            }
            LifecycleAction::ShowFull => {
                let _ = show_window(app, FULL_WINDOW_LABEL);
            }
            LifecycleAction::RefreshVisibleWindows => refresh_visible_windows(app),
            LifecycleAction::Exit => app.exit(0),
            _ => {}
        }
    }
}

fn show_compact_panel(app: &AppHandle, tray_rect: Option<tauri::Rect>) {
    let Ok(window) = managed_window(app, COMPACT_WINDOW_LABEL) else {
        return;
    };
    position_compact_panel(&window, tray_rect);
    if let Err(error) = show_window(app, COMPACT_WINDOW_LABEL) {
        eprintln!("PortWatch could not show the compact panel: {error}");
    }
}

fn show_window(app: &AppHandle, label: &str) -> Result<(), PortWatchError> {
    let window = managed_window(app, label)?;

    for action in presentation_actions(label) {
        match action {
            WindowPresentationAction::SetAlwaysOnTop(always_on_top) => window
                .set_always_on_top(always_on_top)
                .map_err(|_| desktop_error("set_window_level"))?,
            WindowPresentationAction::SetVisibleOnAllWorkspaces(visible) => {
                set_workspace_visibility(&window, visible)?;
            }
            WindowPresentationAction::Unminimize => window
                .unminimize()
                .map_err(|_| desktop_error("restore_window"))?,
            WindowPresentationAction::Show => {
                window.show().map_err(|_| desktop_error("show_window"))?
            }
            WindowPresentationAction::Focus => window
                .set_focus()
                .map_err(|_| desktop_error("focus_window"))?,
            WindowPresentationAction::RequestNativeForeground => {
                #[cfg(target_os = "macos")]
                macos::present_compact_window(&window)?;
            }
            WindowPresentationAction::RequestRefresh => window
                .emit(REFRESH_EVENT, ())
                .map_err(|_| desktop_error("request_refresh"))?,
        }
    }

    window
        .emit(VISIBILITY_EVENT, true)
        .map_err(|_| desktop_error("report_window_visibility"))?;

    Ok(())
}

#[cfg(target_os = "macos")]
fn set_workspace_visibility(
    window: &tauri::WebviewWindow,
    visible: bool,
) -> Result<(), PortWatchError> {
    window
        .set_visible_on_all_workspaces(visible)
        .map_err(|_| desktop_error("set_workspace_visibility"))
}

#[cfg(target_os = "linux")]
fn set_workspace_visibility(
    window: &tauri::WebviewWindow,
    visible: bool,
) -> Result<(), PortWatchError> {
    // Workspace support varies by Linux window manager, so failure must not
    // prevent an otherwise usable tray window from opening.
    let _ = window.set_visible_on_all_workspaces(visible);
    Ok(())
}

#[cfg(target_os = "windows")]
fn set_workspace_visibility(
    _window: &tauri::WebviewWindow,
    _visible: bool,
) -> Result<(), PortWatchError> {
    // Tauri documents this operation as unsupported on Windows.
    Ok(())
}

fn refresh_visible_windows(app: &AppHandle) {
    for label in [COMPACT_WINDOW_LABEL, FULL_WINDOW_LABEL] {
        if let Some(window) = app.get_webview_window(label) {
            if window.is_visible().unwrap_or(false) {
                let _ = window.emit(REFRESH_EVENT, ());
            }
        }
    }
}

fn managed_window(app: &AppHandle, label: &str) -> Result<tauri::WebviewWindow, PortWatchError> {
    if !lifecycle::is_managed_window_label(label) {
        return Err(desktop_error("invalid_window_label"));
    }
    app.get_webview_window(label)
        .ok_or_else(|| desktop_error("missing_window"))
}

fn position_compact_panel(window: &tauri::WebviewWindow, tray_rect: Option<tauri::Rect>) {
    let Ok(panel_size) = window.outer_size() else {
        return;
    };

    let monitor = tray_rect
        .as_ref()
        .and_then(|rect| {
            let position = rect
                .position
                .to_physical::<i32>(window.scale_factor().unwrap_or(1.0));
            window
                .monitor_from_point(position.x as f64, position.y as f64)
                .ok()
                .flatten()
        })
        .or_else(|| window.current_monitor().ok().flatten())
        .or_else(|| window.primary_monitor().ok().flatten());

    let Some(monitor) = monitor else {
        let _ = window.center();
        return;
    };
    let work_area = *monitor.work_area();
    let position = if let Some(rect) = tray_rect {
        let scale_factor = monitor.scale_factor();
        let tray = PhysicalRect {
            position: rect.position.to_physical::<i32>(scale_factor),
            size: rect.size.to_physical::<u32>(scale_factor),
        };
        positioning::panel_position(tray, panel_size, work_area)
    } else {
        positioning::fallback_position(panel_size, work_area)
    };
    let _ = window.set_position(position);
}

fn desktop_error(operation: &str) -> PortWatchError {
    PortWatchError::DesktopOperationFailed {
        operation: operation.into(),
    }
}

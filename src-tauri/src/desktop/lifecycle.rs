pub const COMPACT_WINDOW_LABEL: &str = "compact";
pub const FULL_WINDOW_LABEL: &str = "full";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LifecycleEvent {
    TrayActivated { compact_visible: bool },
    OpenFullView,
    WindowCloseRequested { label: &'static str },
    CompactFocusChanged { focused: bool },
    TrayRefresh,
    ExplicitQuit,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LifecycleAction {
    ShowCompact,
    HideCompact,
    ShowFull,
    HideWindow(&'static str),
    PreventClose,
    RefreshVisibleWindows,
    Exit,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WindowPresentationAction {
    SetAlwaysOnTop(bool),
    SetVisibleOnAllWorkspaces(bool),
    Unminimize,
    Show,
    Focus,
    RequestNativeForeground,
    RequestRefresh,
}

pub fn decide(event: LifecycleEvent) -> Vec<LifecycleAction> {
    match event {
        LifecycleEvent::TrayActivated {
            compact_visible: true,
        } => vec![LifecycleAction::HideCompact],
        LifecycleEvent::TrayActivated {
            compact_visible: false,
        } => vec![LifecycleAction::ShowCompact],
        LifecycleEvent::OpenFullView => {
            vec![LifecycleAction::HideCompact, LifecycleAction::ShowFull]
        }
        LifecycleEvent::WindowCloseRequested { label } if is_managed_window_label(label) => {
            vec![
                LifecycleAction::PreventClose,
                LifecycleAction::HideWindow(label),
            ]
        }
        LifecycleEvent::WindowCloseRequested { .. } => Vec::new(),
        LifecycleEvent::CompactFocusChanged { focused: false } => {
            vec![LifecycleAction::HideCompact]
        }
        LifecycleEvent::CompactFocusChanged { focused: true } => Vec::new(),
        LifecycleEvent::TrayRefresh => vec![LifecycleAction::RefreshVisibleWindows],
        LifecycleEvent::ExplicitQuit => vec![LifecycleAction::Exit],
    }
}

pub fn is_managed_window_label(label: &str) -> bool {
    matches!(label, COMPACT_WINDOW_LABEL | FULL_WINDOW_LABEL)
}

pub fn presentation_actions(label: &str) -> Vec<WindowPresentationAction> {
    let (always_on_top, visible_on_all_workspaces) = match label {
        COMPACT_WINDOW_LABEL => (true, true),
        FULL_WINDOW_LABEL => (false, false),
        _ => return Vec::new(),
    };

    let mut actions = vec![
        WindowPresentationAction::SetAlwaysOnTop(always_on_top),
        WindowPresentationAction::SetVisibleOnAllWorkspaces(visible_on_all_workspaces),
        WindowPresentationAction::Unminimize,
        WindowPresentationAction::Show,
        WindowPresentationAction::Focus,
    ];
    if label == COMPACT_WINDOW_LABEL {
        actions.push(WindowPresentationAction::RequestNativeForeground);
    }
    actions.push(WindowPresentationAction::RequestRefresh);
    actions
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tray_activation_toggles_the_existing_compact_window() {
        assert_eq!(
            decide(LifecycleEvent::TrayActivated {
                compact_visible: false
            }),
            vec![LifecycleAction::ShowCompact]
        );
        assert_eq!(
            decide(LifecycleEvent::TrayActivated {
                compact_visible: true
            }),
            vec![LifecycleAction::HideCompact]
        );
    }

    #[test]
    fn opening_full_view_hides_compact_and_reuses_full() {
        assert_eq!(
            decide(LifecycleEvent::OpenFullView),
            vec![LifecycleAction::HideCompact, LifecycleAction::ShowFull]
        );
    }

    #[test]
    fn close_requests_are_intercepted_only_for_known_windows() {
        assert_eq!(
            decide(LifecycleEvent::WindowCloseRequested {
                label: FULL_WINDOW_LABEL
            }),
            vec![
                LifecycleAction::PreventClose,
                LifecycleAction::HideWindow(FULL_WINDOW_LABEL)
            ]
        );
        assert!(decide(LifecycleEvent::WindowCloseRequested { label: "dialog" }).is_empty());
    }

    #[test]
    fn compact_panel_hides_when_it_loses_focus() {
        assert_eq!(
            decide(LifecycleEvent::CompactFocusChanged { focused: false }),
            vec![LifecycleAction::HideCompact]
        );
        assert!(decide(LifecycleEvent::CompactFocusChanged { focused: true }).is_empty());
    }

    #[test]
    fn explicit_quit_is_the_only_exit_decision() {
        assert_eq!(
            decide(LifecycleEvent::ExplicitQuit),
            vec![LifecycleAction::Exit]
        );
        assert!(!decide(LifecycleEvent::WindowCloseRequested {
            label: COMPACT_WINDOW_LABEL
        })
        .contains(&LifecycleAction::Exit));
    }

    #[test]
    fn tray_refresh_routes_to_visible_windows() {
        assert_eq!(
            decide(LifecycleEvent::TrayRefresh),
            vec![LifecycleAction::RefreshVisibleWindows]
        );
    }

    #[test]
    fn window_labels_are_explicit_and_stable() {
        assert!(is_managed_window_label(COMPACT_WINDOW_LABEL));
        assert!(is_managed_window_label(FULL_WINDOW_LABEL));
        assert!(!is_managed_window_label("main"));
    }

    #[test]
    fn compact_policy_sets_window_level_and_workspace_before_display() {
        assert_eq!(
            presentation_actions(COMPACT_WINDOW_LABEL),
            vec![
                WindowPresentationAction::SetAlwaysOnTop(true),
                WindowPresentationAction::SetVisibleOnAllWorkspaces(true),
                WindowPresentationAction::Unminimize,
                WindowPresentationAction::Show,
                WindowPresentationAction::Focus,
                WindowPresentationAction::RequestNativeForeground,
                WindowPresentationAction::RequestRefresh,
            ]
        );
    }

    #[test]
    fn full_window_policy_remains_normal() {
        assert_eq!(
            presentation_actions(FULL_WINDOW_LABEL),
            vec![
                WindowPresentationAction::SetAlwaysOnTop(false),
                WindowPresentationAction::SetVisibleOnAllWorkspaces(false),
                WindowPresentationAction::Unminimize,
                WindowPresentationAction::Show,
                WindowPresentationAction::Focus,
                WindowPresentationAction::RequestRefresh,
            ]
        );
    }

    #[test]
    fn presentation_policy_rejects_unknown_window_labels() {
        assert!(presentation_actions("dialog").is_empty());
    }
}

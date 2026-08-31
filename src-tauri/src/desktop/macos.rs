use objc2::{rc::Retained, MainThreadMarker};
use objc2_app_kit::{NSApplication, NSFloatingWindowLevel, NSWindow, NSWindowCollectionBehavior};

use crate::errors::PortWatchError;

use super::COMPACT_WINDOW_LABEL;

pub fn present_compact_window(window: &tauri::WebviewWindow) -> Result<(), PortWatchError> {
    if window.label() != COMPACT_WINDOW_LABEL {
        return Err(presentation_error("invalid_native_window_label"));
    }

    if MainThreadMarker::new().is_some() {
        return present_on_main_thread(window).map_err(presentation_error);
    }

    let window_for_main_thread = window.clone();
    window
        .run_on_main_thread(move || {
            if let Err(operation) = present_on_main_thread(&window_for_main_thread) {
                eprintln!("PortWatch could not foreground the compact macOS panel: {operation}");
            }
        })
        .map_err(|_| presentation_error("dispatch_native_presentation"))
}

fn present_on_main_thread(window: &tauri::WebviewWindow) -> Result<(), &'static str> {
    let main_thread = MainThreadMarker::new().ok_or("native_presentation_not_on_main_thread")?;
    let native_handle = window
        .ns_window()
        .map_err(|_| "native_window_handle_unavailable")?;
    if native_handle.is_null() {
        return Err("native_window_handle_is_null");
    }

    // SAFETY: Tauri documents `WebviewWindow::ns_window` as the native handle
    // used by this macOS window, which is an `NSWindow`. The Tauri window clone
    // remains alive for this main-thread closure. Retaining the object confines
    // the typed pointer conversion to this adapter and keeps it alive for every
    // AppKit message below.
    let native_window = unsafe { Retained::<NSWindow>::retain(native_handle.cast()) }
        .ok_or("native_window_retain_failed")?;
    let application = NSApplication::sharedApplication(main_thread);

    native_window.setCollectionBehavior(compact_collection_behavior(
        native_window.collectionBehavior(),
    ));
    native_window.setLevel(NSFloatingWindowLevel);

    // `NSApplication::activate()` is cooperative and does not guarantee that an
    // accessory application becomes active. This compatibility call works on
    // the pre-macOS-14 versions PortWatch supports and is limited to a deliberate
    // tray click that requests the compact panel.
    #[allow(deprecated)]
    application.activateIgnoringOtherApps(true);

    native_window.makeKeyAndOrderFront(None);
    native_window.orderFrontRegardless();
    Ok(())
}

fn compact_collection_behavior(
    mut behavior: NSWindowCollectionBehavior,
) -> NSWindowCollectionBehavior {
    // These pairs are mutually exclusive in AppKit. The compact overlay is not
    // a primary/full-screen window: it is allowed to accompany another app's
    // full-screen window and, on current macOS, join another application's set.
    behavior.remove(NSWindowCollectionBehavior::Primary | NSWindowCollectionBehavior::Auxiliary);
    behavior.remove(
        NSWindowCollectionBehavior::FullScreenPrimary | NSWindowCollectionBehavior::FullScreenNone,
    );
    behavior.insert(
        NSWindowCollectionBehavior::CanJoinAllSpaces
            | NSWindowCollectionBehavior::CanJoinAllApplications
            | NSWindowCollectionBehavior::FullScreenAuxiliary,
    );
    behavior
}

fn presentation_error(operation: impl Into<String>) -> PortWatchError {
    PortWatchError::DesktopOperationFailed {
        operation: operation.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compact_collection_policy_joins_normal_and_other_app_full_screen_spaces() {
        let unrelated = NSWindowCollectionBehavior::Managed;
        let existing = unrelated
            | NSWindowCollectionBehavior::Primary
            | NSWindowCollectionBehavior::FullScreenPrimary;

        let behavior = compact_collection_behavior(existing);

        assert!(behavior.contains(unrelated));
        assert!(behavior.contains(NSWindowCollectionBehavior::CanJoinAllSpaces));
        assert!(behavior.contains(NSWindowCollectionBehavior::CanJoinAllApplications));
        assert!(behavior.contains(NSWindowCollectionBehavior::FullScreenAuxiliary));
        assert!(!behavior.intersects(
            NSWindowCollectionBehavior::Primary | NSWindowCollectionBehavior::Auxiliary
        ));
        assert!(!behavior.intersects(
            NSWindowCollectionBehavior::FullScreenPrimary
                | NSWindowCollectionBehavior::FullScreenNone
        ));
    }
}

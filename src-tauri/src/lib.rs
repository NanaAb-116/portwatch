pub mod commands;
pub mod desktop;
pub mod errors;
pub mod platform;
pub mod ports;
pub mod processes;

use ports::NativePortProvider;
use processes::NativeProcessController;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(NativePortProvider)
        .manage(NativeProcessController)
        .manage(commands::processes::ForceAuthorizations::default())
        .invoke_handler(tauri::generate_handler![
            commands::ports::list_ports,
            commands::processes::terminate_process,
            commands::processes::force_terminate_process,
            commands::windows::hide_compact_panel,
            commands::windows::open_full_view,
            commands::windows::quit_app,
            commands::windows::current_window_is_visible,
        ])
        .setup(desktop::setup)
        .on_window_event(desktop::handle_window_event)
        .run(tauri::generate_context!())
        .expect("failed to run PortWatch");
}

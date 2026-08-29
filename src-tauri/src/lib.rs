pub mod commands;
pub mod errors;
pub mod platform;
pub mod ports;

use ports::NativePortProvider;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(NativePortProvider)
        .invoke_handler(tauri::generate_handler![commands::ports::list_ports])
        .run(tauri::generate_context!())
        .expect("failed to run PortWatch");
}

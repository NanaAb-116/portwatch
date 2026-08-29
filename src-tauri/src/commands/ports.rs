use tauri::State;

use crate::{
    errors::PortWatchError,
    ports::{NativePortProvider, PortEntry, PortProvider, PortQueryOptions},
};

#[tauri::command]
pub async fn list_ports(
    provider: State<'_, NativePortProvider>,
    options: Option<PortQueryOptions>,
) -> Result<Vec<PortEntry>, PortWatchError> {
    let provider = *provider.inner();
    tauri::async_runtime::spawn_blocking(move || provider.list_ports(options.unwrap_or_default()))
        .await
        .map_err(|_| PortWatchError::PortRefreshFailed)?
}

use netstat2::error::Error as NetstatError;
use serde::{Deserialize, Serialize};
use std::io::ErrorKind;
use thiserror::Error;

#[derive(Debug, Clone, Error, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "code", content = "details", rename_all = "snake_case")]
pub enum PortWatchError {
    #[error("permission denied while performing {operation}")]
    PermissionDenied { operation: String },
    #[error("process {pid} no longer exists")]
    ProcessNoLongerExists { pid: u32 },
    #[error("port information is unavailable")]
    PortInformationUnavailable,
    #[error("operation is unsupported on this platform")]
    UnsupportedPlatformOperation,
    #[error("PID {pid} is invalid")]
    InvalidPid { pid: u32 },
    #[error("PID {pid} is a protected process")]
    ProtectedProcess { pid: u32 },
    #[error("PortWatch cannot terminate itself")]
    SelfTermination,
    #[error("failed to terminate PID {pid}")]
    TerminationFailed { pid: u32 },
    #[error("failed to refresh port information")]
    PortRefreshFailed,
}

impl From<NetstatError> for PortWatchError {
    fn from(error: NetstatError) -> Self {
        let permission_denied = match &error {
            NetstatError::OsError(source)
            | NetstatError::FailedToListProcesses(source)
            | NetstatError::FailedToQueryFileDescriptors(source) => {
                source.kind() == ErrorKind::PermissionDenied
            }
            _ => false,
        };

        if permission_denied {
            Self::PermissionDenied {
                operation: "inspect_ports".into(),
            }
        } else {
            Self::PortRefreshFailed
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io;

    #[test]
    fn maps_permission_errors_without_exposing_source_details() {
        let source = io::Error::new(ErrorKind::PermissionDenied, "/private/secret");
        let error = PortWatchError::from(NetstatError::OsError(source));

        assert_eq!(
            error,
            PortWatchError::PermissionDenied {
                operation: "inspect_ports".into()
            }
        );
        assert!(!serde_json::to_string(&error).unwrap().contains("secret"));
    }

    #[test]
    fn maps_other_provider_failures_to_a_safe_error() {
        assert_eq!(
            PortWatchError::from(NetstatError::NotAValidSocket),
            PortWatchError::PortRefreshFailed
        );
    }
}

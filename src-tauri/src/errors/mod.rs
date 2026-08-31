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
    #[error("process identity for PID {pid} changed")]
    ProcessIdentityChanged { pid: u32 },
    #[error("process identity for PID {pid} cannot be verified safely")]
    ProcessIdentityUnverifiable { pid: u32 },
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
    #[error("PID {pid} is still running after graceful termination")]
    ProcessStillRunning { pid: u32 },
    #[error("failed to force terminate PID {pid}")]
    ForceTerminationFailed { pid: u32 },
    #[error("force termination was not authorized for PID {pid}")]
    ForceTerminationNotAuthorized { pid: u32 },
    #[error("failed to refresh port information")]
    PortRefreshFailed,
    #[error("desktop operation failed: {operation}")]
    DesktopOperationFailed { operation: String },
    #[error("system operation failed: {operation}")]
    UnexpectedSystemError { operation: String },
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

    #[test]
    fn serializes_distinct_process_safety_errors_as_typed_codes() {
        let cases = [
            (PortWatchError::SelfTermination, "self_termination"),
            (
                PortWatchError::ProcessIdentityChanged { pid: 42 },
                "process_identity_changed",
            ),
            (
                PortWatchError::ProtectedProcess { pid: 42 },
                "protected_process",
            ),
            (
                PortWatchError::PermissionDenied {
                    operation: "terminate_process".into(),
                },
                "permission_denied",
            ),
            (
                PortWatchError::ForceTerminationFailed { pid: 42 },
                "force_termination_failed",
            ),
        ];

        for (error, code) in cases {
            let value = serde_json::to_value(error).unwrap();
            assert_eq!(value["code"], code);
        }
    }
}

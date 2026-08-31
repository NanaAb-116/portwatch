use crate::errors::PortWatchError;

use super::ProcessIdentity;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[allow(dead_code)] // Non-host variants are exercised by platform-policy unit tests.
pub(crate) enum PlatformKind {
    Macos,
    Linux,
    Windows,
}

impl PlatformKind {
    pub(crate) const fn current() -> Self {
        #[cfg(target_os = "macos")]
        {
            Self::Macos
        }
        #[cfg(target_os = "linux")]
        {
            Self::Linux
        }
        #[cfg(target_os = "windows")]
        {
            Self::Windows
        }
    }
}

/// A deliberately small, conservative policy. It blocks kernel/bootstrap PIDs
/// and a short set of core session/service managers. It cannot determine whether
/// every ordinary application is safe for a user's work to stop.
pub(crate) fn validate_safety(
    target: &ProcessIdentity,
    current_pid: u32,
    platform: PlatformKind,
) -> Result<(), PortWatchError> {
    if target.pid == 0 {
        return Err(PortWatchError::InvalidPid { pid: target.pid });
    }
    if target.pid == current_pid {
        return Err(PortWatchError::SelfTermination);
    }
    if is_protected(target.pid, &target.process_name, platform) {
        return Err(PortWatchError::ProtectedProcess { pid: target.pid });
    }
    Ok(())
}

fn is_protected(pid: u32, name: &str, platform: PlatformKind) -> bool {
    match platform {
        PlatformKind::Macos => {
            pid == 1
                || matches!(
                    name,
                    "kernel_task" | "launchd" | "WindowServer" | "loginwindow"
                )
        }
        PlatformKind::Linux => {
            pid <= 2
                || matches!(name, "systemd" | "init" | "kthreadd")
                || (name.starts_with('[') && name.ends_with(']'))
        }
        PlatformKind::Windows => {
            pid <= 4
                || matches!(
                    name.to_ascii_lowercase().as_str(),
                    "system"
                        | "registry"
                        | "smss.exe"
                        | "csrss.exe"
                        | "wininit.exe"
                        | "services.exe"
                        | "lsass.exe"
                        | "winlogon.exe"
                )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn identity(pid: u32, name: &str) -> ProcessIdentity {
        ProcessIdentity {
            pid,
            process_name: name.into(),
            executable_path: None,
            start_time: 10,
        }
    }

    #[test]
    fn refuses_self_termination_before_platform_policy() {
        assert_eq!(
            validate_safety(&identity(42, "portwatch"), 42, PlatformKind::Linux),
            Err(PortWatchError::SelfTermination)
        );
    }

    #[test]
    fn protects_small_platform_specific_critical_sets() {
        assert!(matches!(
            validate_safety(&identity(1, "launchd"), 99, PlatformKind::Macos),
            Err(PortWatchError::ProtectedProcess { pid: 1 })
        ));
        assert!(matches!(
            validate_safety(&identity(2, "kthreadd"), 99, PlatformKind::Linux),
            Err(PortWatchError::ProtectedProcess { pid: 2 })
        ));
        assert!(matches!(
            validate_safety(&identity(800, "lsass.exe"), 99, PlatformKind::Windows),
            Err(PortWatchError::ProtectedProcess { pid: 800 })
        ));
    }

    #[test]
    fn permits_ordinary_processes() {
        assert_eq!(
            validate_safety(&identity(8000, "node"), 99, PlatformKind::Linux),
            Ok(())
        );
    }
}

use std::{thread, time::Duration};

use sysinfo::{Pid, ProcessesToUpdate, System};

use crate::errors::PortWatchError;

use super::{
    policy::{validate_safety, PlatformKind},
    ProcessController, ProcessIdentity, TerminationStatus,
};

#[cfg(unix)]
#[path = "native/unix.rs"]
mod platform;
#[cfg(target_os = "windows")]
#[path = "native/windows.rs"]
mod platform;

const EXIT_WAIT: Duration = Duration::from_millis(1_500);
const POLL_INTERVAL: Duration = Duration::from_millis(50);

#[derive(Clone, Copy, Default)]
pub struct NativeProcessController;

#[derive(Debug, Clone, PartialEq, Eq)]
struct ProcessSnapshot {
    pid: u32,
    process_name: String,
    executable_path: Option<String>,
    start_time: u64,
}

impl ProcessController for NativeProcessController {
    fn validate(&self, target: &ProcessIdentity) -> Result<(), PortWatchError> {
        validate_target(target).map(|_| ())
    }

    fn terminate_gracefully(
        &self,
        target: &ProcessIdentity,
    ) -> Result<TerminationStatus, PortWatchError> {
        validate_target(target)?;
        match platform::terminate_gracefully(target.pid) {
            Ok(()) => {}
            Err(PortWatchError::ProcessNoLongerExists { .. }) => {
                return Ok(TerminationStatus::AlreadyExited);
            }
            Err(error) => return Err(error),
        }

        if wait_for_exit(target, EXIT_WAIT) {
            Ok(TerminationStatus::Terminated)
        } else {
            Ok(TerminationStatus::StillRunning)
        }
    }

    fn force_terminate(
        &self,
        target: &ProcessIdentity,
    ) -> Result<TerminationStatus, PortWatchError> {
        validate_target(target)?;
        match platform::force_terminate(target.pid) {
            Ok(()) => {}
            Err(PortWatchError::ProcessNoLongerExists { .. }) => {
                return Ok(TerminationStatus::AlreadyExited);
            }
            Err(error) => return Err(error),
        }

        if wait_for_exit(target, EXIT_WAIT) {
            Ok(TerminationStatus::Terminated)
        } else {
            Err(PortWatchError::ForceTerminationFailed { pid: target.pid })
        }
    }

    fn process_exists(&self, pid: u32) -> Result<bool, PortWatchError> {
        if pid == 0 {
            return Err(PortWatchError::InvalidPid { pid });
        }
        Ok(resolve_process(pid).is_some())
    }
}

fn validate_target(target: &ProcessIdentity) -> Result<ProcessSnapshot, PortWatchError> {
    if target.pid == 0 {
        return Err(PortWatchError::InvalidPid { pid: target.pid });
    }
    if target.process_name.trim().is_empty() || target.start_time == 0 {
        return Err(PortWatchError::ProcessIdentityUnverifiable { pid: target.pid });
    }

    let current = resolve_process(target.pid)
        .ok_or(PortWatchError::ProcessNoLongerExists { pid: target.pid })?;
    validate_identity(target, &current)?;
    validate_safety(target, std::process::id(), PlatformKind::current())?;
    Ok(current)
}

fn resolve_process(pid: u32) -> Option<ProcessSnapshot> {
    let sysinfo_pid = Pid::from_u32(pid);
    let mut system = System::new();
    system.refresh_processes(ProcessesToUpdate::Some(&[sysinfo_pid]), true);
    system.process(sysinfo_pid).map(|process| ProcessSnapshot {
        pid,
        process_name: process.name().to_string_lossy().into_owned(),
        executable_path: process
            .exe()
            .map(|path| path.to_string_lossy().into_owned()),
        start_time: process.start_time(),
    })
}

fn validate_identity(
    expected: &ProcessIdentity,
    current: &ProcessSnapshot,
) -> Result<(), PortWatchError> {
    if expected.pid != current.pid
        || expected.process_name != current.process_name
        || expected.start_time != current.start_time
    {
        return Err(PortWatchError::ProcessIdentityChanged { pid: expected.pid });
    }

    if let Some(expected_path) = expected.executable_path.as_deref() {
        let current_path = current
            .executable_path
            .as_deref()
            .ok_or(PortWatchError::ProcessIdentityUnverifiable { pid: expected.pid })?;
        if !paths_match(expected_path, current_path) {
            return Err(PortWatchError::ProcessIdentityChanged { pid: expected.pid });
        }
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn paths_match(left: &str, right: &str) -> bool {
    left.eq_ignore_ascii_case(right)
}

#[cfg(not(target_os = "windows"))]
fn paths_match(left: &str, right: &str) -> bool {
    left == right
}

fn wait_for_exit(target: &ProcessIdentity, timeout: Duration) -> bool {
    let deadline = std::time::Instant::now() + timeout;
    loop {
        match resolve_process(target.pid) {
            None => return true,
            Some(current) if validate_identity(target, &current).is_err() => return true,
            Some(_) if std::time::Instant::now() >= deadline => return false,
            Some(_) => thread::sleep(POLL_INTERVAL),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::{
        process::{Child, Command, Stdio},
        time::Instant,
    };

    use super::*;

    fn identity(pid: u32, name: &str, path: Option<&str>, start_time: u64) -> ProcessIdentity {
        ProcessIdentity {
            pid,
            process_name: name.into(),
            executable_path: path.map(str::to_owned),
            start_time,
        }
    }

    fn snapshot(pid: u32, name: &str, path: Option<&str>, start_time: u64) -> ProcessSnapshot {
        ProcessSnapshot {
            pid,
            process_name: name.into(),
            executable_path: path.map(str::to_owned),
            start_time,
        }
    }

    #[test]
    fn matches_stable_identity_fields() {
        assert_eq!(
            validate_identity(
                &identity(42, "node", Some("/usr/bin/node"), 100),
                &snapshot(42, "node", Some("/usr/bin/node"), 100),
            ),
            Ok(())
        );
    }

    #[test]
    fn detects_pid_reuse_or_metadata_mismatch() {
        for current in [
            snapshot(42, "python", Some("/usr/bin/node"), 100),
            snapshot(42, "node", Some("/usr/bin/node"), 101),
            snapshot(42, "node", Some("/other/node"), 100),
        ] {
            assert!(matches!(
                validate_identity(&identity(42, "node", Some("/usr/bin/node"), 100), &current,),
                Err(PortWatchError::ProcessIdentityChanged { pid: 42 })
            ));
        }
    }

    #[test]
    fn refuses_when_a_previously_known_path_can_no_longer_be_verified() {
        assert_eq!(
            validate_identity(
                &identity(42, "node", Some("/usr/bin/node"), 100),
                &snapshot(42, "node", None, 100),
            ),
            Err(PortWatchError::ProcessIdentityUnverifiable { pid: 42 })
        );
    }

    #[test]
    fn reports_a_disappeared_process() {
        let missing_pid = u32::MAX;
        assert_eq!(
            NativeProcessController.validate(&identity(missing_pid, "missing", None, 1)),
            Err(PortWatchError::ProcessNoLongerExists { pid: missing_pid })
        );
    }

    #[test]
    fn backend_refuses_its_own_exact_identity() {
        let own = resolve_process(std::process::id()).expect("test process should be visible");
        let target = identity(
            own.pid,
            &own.process_name,
            own.executable_path.as_deref(),
            own.start_time,
        );
        assert_eq!(
            NativeProcessController.validate(&target),
            Err(PortWatchError::SelfTermination)
        );
    }

    struct ChildGuard(Child);

    impl Drop for ChildGuard {
        fn drop(&mut self) {
            let _ = self.0.kill();
            let _ = self.0.wait();
        }
    }

    #[test]
    fn real_controller_terminates_only_its_disposable_child() {
        let executable = std::env::current_exe().expect("test executable");
        let child = Command::new(executable)
            .args([
                "--exact",
                "processes::native::tests::disposable_process_child",
                "--nocapture",
            ])
            .env("PORTWATCH_DISPOSABLE_CHILD", "1")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("spawn disposable child");
        let mut guard = ChildGuard(child);
        let pid = guard.0.id();
        let deadline = Instant::now() + Duration::from_secs(5);
        let process = loop {
            if let Some(process) = resolve_process(pid) {
                break process;
            }
            assert!(
                Instant::now() < deadline,
                "child process was not observable"
            );
            thread::sleep(POLL_INTERVAL);
        };
        let target = identity(
            process.pid,
            &process.process_name,
            process.executable_path.as_deref(),
            process.start_time,
        );

        let graceful = NativeProcessController
            .terminate_gracefully(&target)
            .expect("graceful attempt should be safe");
        if graceful == TerminationStatus::StillRunning {
            NativeProcessController
                .force_terminate(&target)
                .expect("force fallback should stop owned child");
        }

        let status = guard.0.wait().expect("wait for disposable child");
        assert!(!status.success());
        assert!(!NativeProcessController.process_exists(pid).unwrap());
    }

    #[test]
    fn disposable_process_child() {
        if std::env::var_os("PORTWATCH_DISPOSABLE_CHILD").is_some() {
            thread::sleep(Duration::from_secs(30));
        }
    }
}

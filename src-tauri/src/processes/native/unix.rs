use std::io;

use crate::errors::PortWatchError;

pub(super) fn terminate_gracefully(pid: u32) -> Result<(), PortWatchError> {
    send_signal(pid, libc::SIGTERM)
}

pub(super) fn force_terminate(pid: u32) -> Result<(), PortWatchError> {
    send_signal(pid, libc::SIGKILL)
}

fn send_signal(pid: u32, signal: libc::c_int) -> Result<(), PortWatchError> {
    let native_pid = i32::try_from(pid).map_err(|_| PortWatchError::InvalidPid { pid })?;
    // SAFETY: the PID is positive and range-checked; the signal is one of the
    // platform constants above. Identity and safety were revalidated by the
    // controller immediately before this call.
    if unsafe { libc::kill(native_pid, signal) } == 0 {
        return Ok(());
    }

    let error = io::Error::last_os_error();
    match error.raw_os_error() {
        Some(libc::ESRCH) => Err(PortWatchError::ProcessNoLongerExists { pid }),
        Some(libc::EPERM) => Err(PortWatchError::PermissionDenied {
            operation: "terminate_process".into(),
        }),
        _ if signal == libc::SIGKILL => Err(PortWatchError::ForceTerminationFailed { pid }),
        _ => Err(PortWatchError::TerminationFailed { pid }),
    }
}

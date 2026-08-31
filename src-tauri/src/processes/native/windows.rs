use std::ffi::c_void;

use windows_sys::Win32::{
    Foundation::{CloseHandle, GetLastError, ERROR_ACCESS_DENIED, ERROR_INVALID_PARAMETER, HWND},
    System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE},
    UI::WindowsAndMessaging::{EnumWindows, GetWindowThreadProcessId, PostMessageW, WM_CLOSE},
};

use crate::errors::PortWatchError;

struct WindowCloseContext {
    pid: u32,
    post_error: Option<u32>,
}

pub(super) fn terminate_gracefully(pid: u32) -> Result<(), PortWatchError> {
    let mut context = WindowCloseContext {
        pid,
        post_error: None,
    };
    // SAFETY: EnumWindows invokes the callback synchronously. `context` remains
    // alive and exclusively owned for the duration of the call.
    let enumerated = unsafe {
        EnumWindows(
            Some(close_window_for_process),
            (&mut context as *mut WindowCloseContext).cast::<c_void>() as isize,
        )
    };
    if let Some(error) = context.post_error {
        return Err(windows_error(pid, "terminate_process", error));
    }
    if enumerated == 0 {
        return Err(last_windows_error(pid, "terminate_process"));
    }

    // A console/background process may have no top-level window. That is still
    // a completed graceful attempt; bounded verification will expose force only
    // if it remains alive.
    Ok(())
}

unsafe extern "system" fn close_window_for_process(hwnd: HWND, value: isize) -> i32 {
    // SAFETY: `value` is the live context pointer supplied to EnumWindows above.
    let context = unsafe { &mut *(value as *mut WindowCloseContext) };
    let mut window_pid = 0;
    // SAFETY: hwnd comes from EnumWindows and the out-pointer is valid.
    unsafe { GetWindowThreadProcessId(hwnd, &mut window_pid) };
    if window_pid == context.pid {
        // SAFETY: posting WM_CLOSE does not retain pointers and is the normal
        // cooperative close request for a top-level Windows application window.
        if unsafe { PostMessageW(hwnd, WM_CLOSE, 0, 0) } == 0 {
            // SAFETY: GetLastError has no preconditions and is read immediately
            // after the failed API call that set it.
            context.post_error = Some(unsafe { GetLastError() });
        }
    }
    1
}

pub(super) fn force_terminate(pid: u32) -> Result<(), PortWatchError> {
    // SAFETY: OpenProcess is called with only the right needed to terminate.
    // The returned handle is closed on every path.
    let handle = unsafe { OpenProcess(PROCESS_TERMINATE, 0, pid) };
    if handle.is_null() {
        return Err(last_windows_error(pid, "force_terminate_process"));
    }
    // SAFETY: handle is a valid owned process handle from OpenProcess.
    let result = unsafe { TerminateProcess(handle, 1) };
    // SAFETY: GetLastError has no preconditions and must be captured before
    // CloseHandle can change the calling thread's last-error value.
    let error = (result == 0).then(|| unsafe { GetLastError() });
    // SAFETY: this function owns the handle and closes it exactly once.
    unsafe { CloseHandle(handle) };
    match error {
        Some(error) => Err(windows_error(pid, "force_terminate_process", error)),
        None => Ok(()),
    }
}

fn last_windows_error(pid: u32, operation: &str) -> PortWatchError {
    // SAFETY: GetLastError has no preconditions.
    windows_error(pid, operation, unsafe { GetLastError() })
}

fn windows_error(pid: u32, operation: &str, error: u32) -> PortWatchError {
    match error {
        ERROR_ACCESS_DENIED => PortWatchError::PermissionDenied {
            operation: operation.into(),
        },
        ERROR_INVALID_PARAMETER => PortWatchError::ProcessNoLongerExists { pid },
        _ if operation == "force_terminate_process" => {
            PortWatchError::ForceTerminationFailed { pid }
        }
        _ => PortWatchError::TerminationFailed { pid },
    }
}

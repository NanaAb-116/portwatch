use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
};

use tauri::State;

use crate::{
    errors::PortWatchError,
    processes::{
        ForceTerminationRequest, NativeProcessController, ProcessController, ProcessIdentity,
        TerminationOutcome, TerminationRequest, TerminationStatus,
    },
};

#[derive(Default)]
pub struct ForceAuthorizations {
    next_id: AtomicU64,
    tickets: Mutex<HashMap<String, ProcessIdentity>>,
}

impl ForceAuthorizations {
    fn issue(&self, target: &ProcessIdentity) -> Result<String, PortWatchError> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let ticket = format!("{}-{id}", target.pid);
        let mut tickets =
            self.tickets
                .lock()
                .map_err(|_| PortWatchError::UnexpectedSystemError {
                    operation: "authorize_force_termination".into(),
                })?;
        tickets.retain(|_, identity| identity.pid != target.pid);
        tickets.insert(ticket.clone(), target.clone());
        Ok(ticket)
    }

    fn consume(&self, authorization: &str, target: &ProcessIdentity) -> Result<(), PortWatchError> {
        let mut tickets =
            self.tickets
                .lock()
                .map_err(|_| PortWatchError::UnexpectedSystemError {
                    operation: "authorize_force_termination".into(),
                })?;
        match tickets.remove(authorization) {
            Some(authorized) if authorized == *target => Ok(()),
            _ => Err(PortWatchError::ForceTerminationNotAuthorized { pid: target.pid }),
        }
    }
}

#[tauri::command]
pub async fn terminate_process(
    controller: State<'_, NativeProcessController>,
    authorizations: State<'_, ForceAuthorizations>,
    request: TerminationRequest,
) -> Result<TerminationOutcome, PortWatchError> {
    let controller = *controller.inner();
    let target = request.target;
    let status = tauri::async_runtime::spawn_blocking(move || {
        controller
            .terminate_gracefully(&target)
            .map(|status| (target, status))
    })
    .await
    .map_err(|_| PortWatchError::UnexpectedSystemError {
        operation: "terminate_process".into(),
    })??;

    outcome_after_graceful(authorizations.inner(), status.0, status.1)
}

#[tauri::command]
pub async fn force_terminate_process(
    controller: State<'_, NativeProcessController>,
    authorizations: State<'_, ForceAuthorizations>,
    request: ForceTerminationRequest,
) -> Result<TerminationOutcome, PortWatchError> {
    authorizations
        .inner()
        .consume(&request.authorization, &request.target)?;
    let controller = *controller.inner();
    let target = request.target;
    let pid = target.pid;
    tauri::async_runtime::spawn_blocking(move || controller.force_terminate(&target))
        .await
        .map_err(|_| PortWatchError::UnexpectedSystemError {
            operation: "force_terminate_process".into(),
        })?
        .and_then(|status| outcome_after_force(status, pid))
}

fn outcome_after_graceful(
    authorizations: &ForceAuthorizations,
    target: ProcessIdentity,
    status: TerminationStatus,
) -> Result<TerminationOutcome, PortWatchError> {
    match status {
        TerminationStatus::Terminated => Ok(TerminationOutcome::Terminated),
        TerminationStatus::AlreadyExited => Ok(TerminationOutcome::AlreadyExited),
        TerminationStatus::StillRunning => Ok(TerminationOutcome::StillRunning {
            force_authorization: authorizations.issue(&target)?,
        }),
    }
}

fn outcome_after_force(
    status: TerminationStatus,
    pid: u32,
) -> Result<TerminationOutcome, PortWatchError> {
    match status {
        TerminationStatus::Terminated => Ok(TerminationOutcome::Terminated),
        TerminationStatus::AlreadyExited => Ok(TerminationOutcome::AlreadyExited),
        TerminationStatus::StillRunning => Err(PortWatchError::ForceTerminationFailed { pid }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn target() -> ProcessIdentity {
        ProcessIdentity {
            pid: 42,
            process_name: "node".into(),
            executable_path: Some("/usr/bin/node".into()),
            start_time: 100,
        }
    }

    #[test]
    fn graceful_failure_is_the_only_way_to_issue_force_authorization() {
        let authorizations = ForceAuthorizations::default();
        let outcome =
            outcome_after_graceful(&authorizations, target(), TerminationStatus::StillRunning)
                .unwrap();
        let TerminationOutcome::StillRunning {
            force_authorization,
        } = outcome
        else {
            panic!("expected force option")
        };

        assert_eq!(
            authorizations.consume(&force_authorization, &target()),
            Ok(())
        );
        assert_eq!(
            authorizations.consume(&force_authorization, &target()),
            Err(PortWatchError::ForceTerminationNotAuthorized { pid: 42 })
        );
    }

    #[test]
    fn force_authorization_is_bound_to_the_exact_identity() {
        let authorizations = ForceAuthorizations::default();
        let ticket = authorizations.issue(&target()).unwrap();
        let mut changed = target();
        changed.start_time += 1;
        assert_eq!(
            authorizations.consume(&ticket, &changed),
            Err(PortWatchError::ForceTerminationNotAuthorized { pid: 42 })
        );
    }

    #[test]
    fn successful_graceful_termination_does_not_issue_force_authorization() {
        let authorizations = ForceAuthorizations::default();
        assert_eq!(
            outcome_after_graceful(&authorizations, target(), TerminationStatus::Terminated),
            Ok(TerminationOutcome::Terminated)
        );
        assert!(authorizations.tickets.lock().unwrap().is_empty());
    }
}

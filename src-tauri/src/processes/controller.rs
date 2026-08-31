use crate::errors::PortWatchError;

use super::ProcessIdentity;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TerminationStatus {
    Terminated,
    AlreadyExited,
    StillRunning,
}

/// The platform-neutral process-control boundary. Implementations must revalidate
/// identity and safety inside each destructive method; command callers are not
/// trusted to have performed those checks.
pub trait ProcessController: Send + Sync {
    fn validate(&self, target: &ProcessIdentity) -> Result<(), PortWatchError>;

    fn terminate_gracefully(
        &self,
        target: &ProcessIdentity,
    ) -> Result<TerminationStatus, PortWatchError>;

    fn force_terminate(
        &self,
        target: &ProcessIdentity,
    ) -> Result<TerminationStatus, PortWatchError>;

    fn process_exists(&self, pid: u32) -> Result<bool, PortWatchError>;
}

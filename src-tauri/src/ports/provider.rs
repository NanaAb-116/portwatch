use crate::errors::PortWatchError;

use super::{PortEntry, PortQueryOptions};

pub trait PortProvider: Send + Sync {
    fn list_ports(&self, options: PortQueryOptions) -> Result<Vec<PortEntry>, PortWatchError>;
}

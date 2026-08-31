use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "camelCase")]
pub struct ProcessIdentity {
    pub pid: u32,
    pub process_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub executable_path: Option<String>,
    pub start_time: u64,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TerminationRequest {
    pub target: ProcessIdentity,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ForceTerminationRequest {
    pub target: ProcessIdentity,
    pub authorization: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum TerminationOutcome {
    Terminated,
    AlreadyExited,
    StillRunning { force_authorization: String },
}

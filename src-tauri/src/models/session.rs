use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SessionStatus {
    Planned,
    Active,
    Paused,
    Completed,
    Abandoned,
}

impl std::fmt::Display for SessionStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SessionStatus::Planned => write!(f, "planned"),
            SessionStatus::Active => write!(f, "active"),
            SessionStatus::Paused => write!(f, "paused"),
            SessionStatus::Completed => write!(f, "completed"),
            SessionStatus::Abandoned => write!(f, "abandoned"),
        }
    }
}

impl SessionStatus {
    pub fn from_str(s: &str) -> Self {
        match s {
            "active" => SessionStatus::Active,
            "paused" => SessionStatus::Paused,
            "completed" => SessionStatus::Completed,
            "abandoned" => SessionStatus::Abandoned,
            _ => SessionStatus::Planned,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub name: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub status: SessionStatus,
    pub created_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionRevision {
    pub id: String,
    pub session_id: String,
    pub revision_type: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub timestamp: String,
}

/// Payload for creating a session.
/// Phase 0 pseudo: only name is used.
/// Phase B1 (real): also accepts task_ids, allocated_minutes, total_minutes.
#[derive(Debug, Deserialize)]
pub struct CreateSessionPayload {
    pub name: Option<String>,
    // Dev B will add scheduling fields here in Module B1
}

/// A task entry within a session blueprint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionTask {
    pub session_id: String,
    pub task_id: String,
    pub task_order: i32,
    pub allocated_minutes: i32,
}

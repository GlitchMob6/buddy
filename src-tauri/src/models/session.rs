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
/// Supports both the old pseudo mode (just name) and the real session engine
/// (name + task_ids + allocated_minutes + total_minutes).
#[derive(Debug, Deserialize)]
pub struct CreateSessionPayload {
    pub name: Option<String>,
    /// Task IDs to include in this session (in order).
    #[serde(default)]
    pub task_ids: Vec<String>,
    /// Allocated minutes per task (parallel to task_ids).
    #[serde(default)]
    pub allocated_minutes: Vec<i32>,
    /// Total session duration in minutes (including breaks).
    #[serde(default)]
    pub total_minutes: i32,
}

/// A task entry within a session blueprint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionTask {
    pub session_id: String,
    pub task_id: String,
    pub task_order: i32,
    pub allocated_minutes: i32,
}

/// A single block in a generated session plan (task block or break).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PlanBlockKind {
    Task,
    Break,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionPlanBlock {
    pub kind: PlanBlockKind,
    /// Task ID if kind == Task, None for breaks.
    pub task_id: Option<String>,
    /// Task title (for display convenience). None for breaks.
    pub task_title: Option<String>,
    /// Duration in minutes for this block.
    pub duration_minutes: i32,
    /// 0-indexed order in the plan.
    pub order: i32,
}

/// Response from the blueprint generation endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlueprintResponse {
    /// The ordered plan blocks (tasks + breaks).
    pub blocks: Vec<SessionPlanBlock>,
    /// Total work minutes (excluding breaks).
    pub total_work_minutes: i32,
    /// Total break minutes.
    pub total_break_minutes: i32,
    /// Task IDs that were deferred (didn't fit).
    pub deferred_task_ids: Vec<String>,
    /// Warnings / recommendations for the user.
    pub warnings: Vec<String>,
}

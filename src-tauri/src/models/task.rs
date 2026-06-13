use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Todo,
    InProgress,
    Completed,
    Archived,
}

impl std::fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TaskStatus::Todo => write!(f, "todo"),
            TaskStatus::InProgress => write!(f, "in_progress"),
            TaskStatus::Completed => write!(f, "completed"),
            TaskStatus::Archived => write!(f, "archived"),
        }
    }
}

impl TaskStatus {
    pub fn from_str(s: &str) -> Self {
        match s {
            "in_progress" => TaskStatus::InProgress,
            "completed" => TaskStatus::Completed,
            "archived" => TaskStatus::Archived,
            _ => TaskStatus::Todo,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    /// 1 (low) – 10 (critical)
    pub priority: i32,
    pub status: TaskStatus,
    pub deadline: Option<String>,
    pub estimated_minutes: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// Fields accepted when creating a new task. All optional except title.
#[derive(Debug, Deserialize)]
pub struct CreateTaskPayload {
    pub title: String,
    pub parent_id: Option<String>,
    pub description: Option<String>,
    pub priority: Option<i32>,
    pub deadline: Option<String>,
    pub estimated_minutes: Option<i32>,
}

/// Fields accepted when updating a task. All optional.
#[derive(Debug, Deserialize)]
pub struct UpdateTaskPayload {
    pub id: String,
    pub title: Option<String>,
    pub parent_id: Option<String>,
    pub description: Option<String>,
    pub priority: Option<i32>,
    pub status: Option<String>,
    pub deadline: Option<String>,
    pub estimated_minutes: Option<i32>,
}

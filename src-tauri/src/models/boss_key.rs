use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BossKeyReason {
    Emergency,
    Meeting,
    Accidental,
    Other,
}

impl std::fmt::Display for BossKeyReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BossKeyReason::Emergency => write!(f, "Emergency"),
            BossKeyReason::Meeting => write!(f, "Meeting"),
            BossKeyReason::Accidental => write!(f, "Accidental"),
            BossKeyReason::Other => write!(f, "Other"),
        }
    }
}

impl BossKeyReason {
    pub fn from_str(s: &str) -> Self {
        match s {
            "Emergency" => BossKeyReason::Emergency,
            "Meeting" => BossKeyReason::Meeting,
            "Accidental" => BossKeyReason::Accidental,
            _ => BossKeyReason::Other,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BossKeyUsage {
    pub id: String,
    pub session_id: String,
    pub timestamp: String,
    pub reason: BossKeyReason,
    pub free_exit_used: bool,
    pub penalty_applied: bool,
}

/// Returned from `use_boss_key` so the frontend knows what happened.
#[derive(Debug, Serialize, Deserialize)]
pub struct BossKeyResult {
    pub usage: BossKeyUsage,
    pub free_exit_used: bool,
    pub penalty_applied: bool,
    /// How many free exits remain this session (0 if penalty kicked in)
    pub free_exits_remaining: i32,
}

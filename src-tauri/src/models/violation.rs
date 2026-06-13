use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ViolationSeverity {
    Low,
    Medium,
    High,
}

impl std::fmt::Display for ViolationSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ViolationSeverity::Low => write!(f, "low"),
            ViolationSeverity::Medium => write!(f, "medium"),
            ViolationSeverity::High => write!(f, "high"),
        }
    }
}

impl ViolationSeverity {
    pub fn from_str(s: &str) -> Self {
        match s {
            "medium" => ViolationSeverity::Medium,
            "high" => ViolationSeverity::High,
            _ => ViolationSeverity::Low,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Violation {
    pub id: String,
    pub session_id: String,
    /// e.g. "off_task_domain", "unauthorized_app"
    pub violation_type: String,
    pub severity: ViolationSeverity,
    /// The resource that triggered the violation (domain, exe name, etc.)
    pub resource: Option<String>,
    pub timestamp: String,
    pub resolved: bool,
    pub false_positive: bool,
}

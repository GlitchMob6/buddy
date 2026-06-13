use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringEvent {
    pub id: String,
    pub session_id: String,
    pub event_type: String,
    pub value: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityLog {
    pub id: String,
    pub session_id: String,
    pub timestamp: String,
    pub active_resource: Option<String>,
    pub active_window_title: Option<String>,
    pub keystrokes_per_min: Option<f64>,
    pub mouse_distance_per_min: Option<f64>,
    pub idle_seconds: Option<i32>,
}

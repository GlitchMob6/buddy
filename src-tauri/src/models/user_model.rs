use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserModel {
    pub id: i32,
    // Focus Profile
    pub focus_score: f64,
    pub average_focus_duration: f64,
    pub average_distraction_interval: f64,
    // Execution Profile
    pub completion_rate: f64,
    pub average_estimation_accuracy: f64,
    pub average_session_length: f64,
    pub preferred_work_window: String,
    // Behavior Profile
    pub violation_profile: String,
    pub boss_key_usage_count: i32,
    /// JSON array of top distracting domains/apps
    pub most_common_distractions: String,
    /// JSON object of task category → completion rate
    pub task_preference_profile: String,
    pub schedule_adherence: f64,
    pub updated_at: String,
}

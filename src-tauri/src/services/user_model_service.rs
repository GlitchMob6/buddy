/// User model service — stub. Real implementation in Module B3.
///
/// Computes focus profile, execution profile, and behavior profile
/// from session history using rules + rolling averages (no ML).

use rusqlite::Connection;
use crate::models::user_model::UserModel;

/// Get the current user model row (single-row table, id=1).
pub fn get(conn: &Connection) -> Result<UserModel, String> {
    conn.query_row(
        "SELECT id, focus_score, average_focus_duration, average_distraction_interval,
                completion_rate, average_estimation_accuracy, average_session_length,
                preferred_work_window, violation_profile, boss_key_usage_count,
                most_common_distractions, task_preference_profile, schedule_adherence, updated_at
         FROM user_model WHERE id = 1",
        [],
        |row| Ok(UserModel {
            id: row.get(0)?,
            focus_score: row.get(1)?,
            average_focus_duration: row.get(2)?,
            average_distraction_interval: row.get(3)?,
            completion_rate: row.get(4)?,
            average_estimation_accuracy: row.get(5)?,
            average_session_length: row.get(6)?,
            preferred_work_window: row.get(7)?,
            violation_profile: row.get(8)?,
            boss_key_usage_count: row.get(9)?,
            most_common_distractions: row.get(10)?,
            task_preference_profile: row.get(11)?,
            schedule_adherence: row.get(12)?,
            updated_at: row.get(13)?,
        }),
    )
    .map_err(|e| e.to_string())
}

/// [STUB] Recompute all user model fields from session/task history.
/// Dev B implements real computation in Module B3.
pub fn recompute(conn: &Connection) -> Result<UserModel, String> {
    get(conn) // stub — just return current model unchanged
}

/// [STUB] Get focus score history over the last N days.
pub fn get_focus_history(_conn: &Connection, _days: Option<i32>) -> Result<Vec<(String, f64)>, String> {
    Ok(vec![]) // stub
}

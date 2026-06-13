/// Monitoring service — stub. Real implementation in Module A3.
///
/// Window tracking, violation detection, activity logging.
/// Spawns a polling background thread only when a session is active.

use crate::models::monitoring::ActivityLog;
use crate::models::violation::Violation;

/// [STUB] Start the monitoring polling loop for a session.
/// Real impl: spawns OS-level window tracker thread.
pub fn start(_session_id: &str) -> Result<(), String> {
    Ok(()) // stub
}

/// [STUB] Stop the monitoring loop.
pub fn stop() -> Result<(), String> {
    Ok(()) // stub
}

/// [STUB] Get violations for a session.
pub fn get_violations(_session_id: &str) -> Result<Vec<Violation>, String> {
    Ok(vec![]) // stub
}

/// [STUB] Mark a violation as a false positive.
pub fn mark_false_positive(_violation_id: &str) -> Result<(), String> {
    Ok(()) // stub
}

/// [STUB] Get activity log entries for a session.
pub fn get_activity_log(_session_id: &str, _limit: Option<i32>) -> Result<Vec<ActivityLog>, String> {
    Ok(vec![]) // stub
}

/// Monitoring IPC commands — thin adapters over monitoring_service.
/// All stubs until Module A3.

use tauri::State;
use crate::db::connection::DbConnection;
use crate::models::monitoring::ActivityLog;
use crate::models::violation::Violation;
use crate::services::monitoring_service as svc;

#[tauri::command]
pub fn start_monitoring(_session_id: String, _db: State<DbConnection>) -> Result<(), String> {
    svc::start(&_session_id)
}

#[tauri::command]
pub fn stop_monitoring(_db: State<DbConnection>) -> Result<(), String> {
    svc::stop()
}

#[tauri::command]
pub fn get_session_violations(_session_id: String, _db: State<DbConnection>) -> Result<Vec<Violation>, String> {
    svc::get_violations(&_session_id)
}

#[tauri::command]
pub fn mark_false_positive(_violation_id: String, _db: State<DbConnection>) -> Result<(), String> {
    svc::mark_false_positive(&_violation_id)
}

#[tauri::command]
pub fn get_activity_log(_session_id: String, _limit: Option<i32>, _db: State<DbConnection>) -> Result<Vec<ActivityLog>, String> {
    svc::get_activity_log(&_session_id, _limit)
}

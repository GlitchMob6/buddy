/// Session IPC commands — thin adapters over session_service.
///
/// These command signatures are STABLE — same in Phase 0 pseudo and Module B1 real.
/// Dev B replaces session_service internals without touching this file.

use tauri::State;
use crate::db::connection::DbConnection;
use crate::models::session::{CreateSessionPayload, Session};
use crate::services::session_service as svc;

#[tauri::command]
pub fn create_session(payload: CreateSessionPayload, db: State<DbConnection>) -> Result<Session, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::create(&conn, payload.name)
}

#[tauri::command]
pub fn start_session(id: String, db: State<DbConnection>) -> Result<Session, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::start(&conn, &id)
}

#[tauri::command]
pub fn pause_session(id: String, db: State<DbConnection>) -> Result<Session, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::pause(&conn, &id)
}

#[tauri::command]
pub fn resume_session(id: String, db: State<DbConnection>) -> Result<Session, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::resume(&conn, &id)
}

#[tauri::command]
pub fn complete_session(id: String, db: State<DbConnection>) -> Result<Session, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::complete(&conn, &id)
}

#[tauri::command]
pub fn abandon_session(id: String, db: State<DbConnection>) -> Result<Session, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::abandon(&conn, &id)
}

#[tauri::command]
pub fn get_active_session(db: State<DbConnection>) -> Result<Option<Session>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::get_active(&conn)
}

#[tauri::command]
pub fn get_sessions(status_filter: Option<String>, db: State<DbConnection>) -> Result<Vec<Session>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::list(&conn, status_filter)
}

// ── Stubs (Dev B fills in Module B1) ─────────────────────────────────────────

#[tauri::command]
pub fn add_session_task(_session_id: String, _task_id: String, _allocated_minutes: i32, _db: State<DbConnection>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn remove_session_task(_session_id: String, _task_id: String, _db: State<DbConnection>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn reorder_session_tasks(_session_id: String, _task_ids: Vec<String>, _db: State<DbConnection>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn update_task_allocation(_session_id: String, _task_id: String, _new_minutes: i32, _db: State<DbConnection>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn get_session_tasks(_session_id: String, _db: State<DbConnection>) -> Result<Vec<crate::models::session::SessionTask>, String> {
    Ok(vec![])
}

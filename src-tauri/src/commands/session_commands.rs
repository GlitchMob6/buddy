/// Session IPC commands — thin adapters over session_service.
///
/// Module B1a: all stubs are now wired to real service implementations.
/// Blueprint generation is exposed as a new command.

use tauri::State;
use crate::db::connection::DbConnection;
use crate::models::session::{CreateSessionPayload, Session, SessionTask, BlueprintResponse};
use crate::services::session_service as svc;

#[tauri::command]
pub fn create_session(payload: CreateSessionPayload, db: State<DbConnection>) -> Result<Session, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::create(
        &conn,
        payload.name,
        payload.task_ids,
        payload.allocated_minutes,
    )
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

// ── Session Tasks CRUD (now real) ────────────────────────────────────────────

#[tauri::command]
pub fn add_session_task(session_id: String, task_id: String, allocated_minutes: i32, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::add_session_task(&conn, &session_id, &task_id, allocated_minutes)
}

#[tauri::command]
pub fn remove_session_task(session_id: String, task_id: String, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::remove_session_task(&conn, &session_id, &task_id)
}

#[tauri::command]
pub fn reorder_session_tasks(session_id: String, task_ids: Vec<String>, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::reorder_session_tasks(&conn, &session_id, task_ids)
}

#[tauri::command]
pub fn update_task_allocation(session_id: String, task_id: String, new_minutes: i32, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::update_task_allocation(&conn, &session_id, &task_id, new_minutes)
}

#[tauri::command]
pub fn get_session_tasks(session_id: String, db: State<DbConnection>) -> Result<Vec<SessionTask>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::get_session_tasks(&conn, &session_id)
}

// ── Blueprint generation (new) ───────────────────────────────────────────────

#[tauri::command]
pub fn generate_session_blueprint(
    task_ids: Vec<String>,
    total_minutes: i32,
    db: State<DbConnection>,
) -> Result<BlueprintResponse, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::generate_blueprint(&conn, task_ids, total_minutes)
}

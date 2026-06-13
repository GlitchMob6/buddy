/// Resource IPC commands — thin adapters over resource_service.

use tauri::State;
use crate::db::connection::DbConnection;
use crate::models::resource::{RegisterResourcePayload, Resource};
use crate::services::resource_service as svc;

#[tauri::command]
pub fn scan_resources(db: State<DbConnection>) -> Result<Vec<Resource>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::scan(&conn)
}

#[tauri::command]
pub fn register_resource(payload: RegisterResourcePayload, db: State<DbConnection>) -> Result<Resource, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::register(&conn, payload)
}

#[tauri::command]
pub fn delete_resource(id: String, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::delete(&conn, &id)
}

#[tauri::command]
pub fn get_resources(category_filter: Option<String>, db: State<DbConnection>) -> Result<Vec<Resource>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::list(&conn, category_filter)
}

#[tauri::command]
pub fn assign_resource_to_task(task_id: String, resource_id: String, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::assign_to_task(&conn, &task_id, &resource_id)
}

#[tauri::command]
pub fn unassign_resource_from_task(task_id: String, resource_id: String, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::unassign_from_task(&conn, &task_id, &resource_id)
}

#[tauri::command]
pub fn get_task_resources(task_id: String, db: State<DbConnection>) -> Result<Vec<Resource>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::get_task_resources(&conn, &task_id)
}

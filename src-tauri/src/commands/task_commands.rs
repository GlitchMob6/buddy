/// Task IPC commands — thin adapters over task_service.

use tauri::State;
use crate::db::connection::DbConnection;
use crate::models::task::{CreateTaskPayload, Task, UpdateTaskPayload};
use crate::services::task_service as svc;

#[tauri::command]
pub fn create_task(payload: CreateTaskPayload, db: State<DbConnection>) -> Result<Task, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::create(&conn, payload)
}

#[tauri::command]
pub fn get_task_tree(db: State<DbConnection>) -> Result<Vec<Task>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::list_all(&conn)
}

#[tauri::command]
pub fn get_task(id: String, db: State<DbConnection>) -> Result<Task, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::fetch(&conn, &id)
}

#[tauri::command]
pub fn update_task(payload: UpdateTaskPayload, db: State<DbConnection>) -> Result<Task, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::update(&conn, payload)
}

#[tauri::command]
pub fn delete_task(id: String, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::delete(&conn, &id)
}

#[tauri::command]
pub fn reorder_tasks(parent_id: String, task_ids: Vec<String>, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::reorder_tasks(&conn, &parent_id, task_ids)
}

/// Workspace IPC commands — thin adapters over workspace_service.

use tauri::State;
use crate::db::connection::DbConnection;
use crate::models::settings::Workspace;
use crate::services::workspace_service as svc;

#[tauri::command]
pub fn create_workspace(session_id: String, name: Option<String>, db: State<DbConnection>) -> Result<Workspace, String> {
    let conn = db.0.lock().unwrap();
    svc::create(&conn, &session_id, name)
}

#[tauri::command]
pub fn enter_workspace(app: tauri::AppHandle) -> Result<(), String> {
    svc::enter_workspace(&app)
}

#[tauri::command]
pub fn exit_workspace(app: tauri::AppHandle) -> Result<(), String> {
    svc::exit_workspace(&app)
}

#[tauri::command]
pub fn get_session_workspaces(session_id: String, db: State<DbConnection>) -> Result<Vec<Workspace>, String> {
    let conn = db.0.lock().unwrap();
    svc::list(&conn, &session_id)
}

#[tauri::command]
pub fn switch_workspace(workspace_id: String, _db: State<DbConnection>) -> Result<(), String> {
    svc::switch(&workspace_id)
}

#[tauri::command]
pub fn destroy_workspace(workspace_id: String, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.0.lock().unwrap();
    svc::destroy(&conn, &workspace_id)
}

#[tauri::command]
pub fn launch_resource(resource_id: String, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.0.lock().unwrap();
    svc::launch_resource(&conn, &resource_id)
}

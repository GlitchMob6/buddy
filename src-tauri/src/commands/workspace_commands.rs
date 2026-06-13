/// Workspace IPC commands — thin adapters over workspace_service.
/// All stubs until Module A4.

use tauri::State;
use crate::db::connection::DbConnection;
use crate::models::settings::Workspace;
use crate::services::workspace_service as svc;

#[tauri::command]
pub fn create_workspace(_session_id: String, _name: Option<String>, _db: State<DbConnection>) -> Result<Workspace, String> {
    svc::create(&_session_id, _name)
}

#[tauri::command]
pub fn get_session_workspaces(_session_id: String, _db: State<DbConnection>) -> Result<Vec<Workspace>, String> {
    svc::list(&_session_id)
}

#[tauri::command]
pub fn switch_workspace(_workspace_id: String, _db: State<DbConnection>) -> Result<(), String> {
    svc::switch(&_workspace_id)
}

#[tauri::command]
pub fn destroy_workspace(_workspace_id: String, _db: State<DbConnection>) -> Result<(), String> {
    svc::destroy(&_workspace_id)
}

#[tauri::command]
pub fn launch_resource(_resource_id: String, _db: State<DbConnection>) -> Result<(), String> {
    svc::launch_resource(&_resource_id)
}

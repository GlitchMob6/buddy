/// User Model IPC commands — thin adapters over user_model_service.

use tauri::State;
use crate::db::connection::DbConnection;
use crate::models::user_model::UserModel;
use crate::services::user_model_service as svc;

#[tauri::command]
pub fn get_user_model(db: State<DbConnection>) -> Result<UserModel, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::get(&conn)
}

#[tauri::command]
pub fn recompute_user_model(db: State<DbConnection>) -> Result<UserModel, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::recompute(&conn)
}

#[tauri::command]
pub fn get_focus_score_history(_days: Option<i32>, db: State<DbConnection>) -> Result<Vec<(String, f64)>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    svc::get_focus_history(&conn, _days)
}

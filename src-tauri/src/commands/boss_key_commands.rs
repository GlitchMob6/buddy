/// Boss Key IPC commands — session-aware, returns BossKeyResult.

use tauri::State;
use crate::db::connection::DbConnection;
use crate::models::boss_key::BossKeyResult;
use crate::services::boss_key_service as svc;
use crate::services::workspace_service::exit_workspace;

#[tauri::command]
pub fn use_boss_key(reason: String, app: tauri::AppHandle, db: State<DbConnection>) -> Result<BossKeyResult, String> {
    let conn = db.0.lock().unwrap();

    // Look up the active session
    let session_id: String = conn.query_row(
        "SELECT id FROM sessions WHERE status = 'active' LIMIT 1",
        [],
        |row| row.get(0),
    ).map_err(|_| "No active session — boss key requires an active session".to_string())?;

    let result = svc::use_boss_key(&conn, &session_id, &reason)?;

    // Drop the lock before calling exit_workspace (which doesn't need it)
    drop(conn);

    // Always exit workspace on boss key
    exit_workspace(&app)?;

    Ok(result)
}

#[tauri::command]
pub fn get_boss_key_usage(session_id: String, db: State<DbConnection>) -> Result<i32, String> {
    let conn = db.0.lock().unwrap();
    Ok(svc::get_boss_key_count(&conn, &session_id))
}

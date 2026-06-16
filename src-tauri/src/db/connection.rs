use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

use crate::db::schema::{SCHEMA_SQL, MIGRATIONS};

/// Global SQLite connection wrapped in a Mutex for Tauri state.
pub struct DbConnection(pub Mutex<Connection>);

/// Returns the path to the SQLite database file.
/// On all platforms, stored in Tauri's app data directory.
pub fn db_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to resolve app data directory");
    std::fs::create_dir_all(&data_dir).expect("Failed to create app data directory");
    data_dir.join("buddy.db")
}

/// Opens (or creates) the SQLite database, runs the full schema,
/// then applies incremental migrations (idempotent).
pub fn open(path: &PathBuf) -> Result<Connection> {
    let conn = Connection::open(path)?;
    // Run all CREATE TABLE statements
    conn.execute_batch(SCHEMA_SQL)?;
    // Run incremental migrations — ignore "duplicate column" errors
    for migration in MIGRATIONS {
        let _ = conn.execute(migration, []);
    }
    Ok(conn)
}

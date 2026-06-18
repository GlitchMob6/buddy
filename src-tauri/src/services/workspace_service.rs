/// Workspace service — real implementation for Module A4.
///
/// Session-scoped workspace creation, switching, and resource enforcement.

use rusqlite::Connection;
use crate::models::settings::Workspace;
use tauri::{AppHandle, Manager};
use uuid::Uuid;
use chrono::Utc;

/// Create a workspace tied to a session.
pub fn create(conn: &Connection, session_id: &str, name: Option<String>) -> Result<Workspace, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let ws_name = name.unwrap_or_else(|| {
        // Auto-name based on count
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM workspaces WHERE session_id = ?1",
            rusqlite::params![session_id],
            |row| row.get(0),
        ).unwrap_or(0);
        format!("Workspace {}", count + 1)
    });

    conn.execute(
        "INSERT INTO workspaces (id, session_id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, session_id, ws_name, now, now],
    ).map_err(|e| format!("Failed to create workspace: {}", e))?;

    Ok(Workspace {
        id,
        session_id: session_id.to_string(),
        name: Some(ws_name),
        created_at: now.clone(),
        updated_at: now,
    })
}

/// Show the overlay top bar and minimize the main window.
pub fn enter_workspace(app: &AppHandle) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window("assistive-overlay") {
        overlay.show().map_err(|e| e.to_string())?;
        overlay.set_always_on_top(true).map_err(|e| e.to_string())?;
    }
    if let Some(main) = app.get_webview_window("main") {
        main.minimize().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Hide the overlay and restore the main window.
pub fn exit_workspace(app: &AppHandle) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window("assistive-overlay") {
        overlay.hide().map_err(|e| e.to_string())?;
    }
    if let Some(main) = app.get_webview_window("main") {
        main.unminimize().map_err(|e| e.to_string())?;
        main.show().map_err(|e| e.to_string())?;
        main.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Get all workspaces for a session.
pub fn list(conn: &Connection, session_id: &str) -> Result<Vec<Workspace>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, name, created_at, updated_at FROM workspaces WHERE session_id = ?1 ORDER BY created_at ASC"
    ).map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows = stmt.query_map(rusqlite::params![session_id], |row| {
        Ok(Workspace {
            id: row.get(0)?,
            session_id: row.get(1)?,
            name: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }).map_err(|e| format!("Failed to query workspaces: {}", e))?;

    let mut workspaces = Vec::new();
    for ws in rows {
        workspaces.push(ws.map_err(|e| format!("Failed to read workspace row: {}", e))?);
    }
    Ok(workspaces)
}

/// Switch the active workspace — for MVP this is a no-op on the backend
/// (workspace tabs are mental separation, same resources).
pub fn switch(_workspace_id: &str) -> Result<(), String> {
    Ok(())
}

/// Destroy a workspace.
pub fn destroy(conn: &Connection, workspace_id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM workspaces WHERE id = ?1",
        rusqlite::params![workspace_id],
    ).map_err(|e| format!("Failed to destroy workspace: {}", e))?;
    Ok(())
}

/// Launch a registered resource (open app/URL/folder).
pub fn launch_resource(conn: &Connection, resource_id: &str) -> Result<(), String> {
    let resource_value: String = conn.query_row(
        "SELECT resource_value FROM registered_resources WHERE id = ?1",
        rusqlite::params![resource_id],
        |row| row.get(0),
    ).map_err(|e| format!("Failed to find resource: {}", e))?;

    if resource_value.to_lowercase().ends_with(".exe") || !resource_value.starts_with("http") {
        std::process::Command::new(&resource_value)
            .spawn()
            .map_err(|e| format!("Failed to launch application {}: {}", resource_value, e))?;
    } else {
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("cmd")
                .args(&["/C", "start", "", &resource_value])
                .spawn()
                .map_err(|e| format!("Failed to open URL {}: {}", resource_value, e))?;
        }
        #[cfg(not(target_os = "windows"))]
        {
            std::process::Command::new("xdg-open")
                .arg(&resource_value)
                .spawn()
                .map_err(|e| format!("Failed to open URL {}: {}", resource_value, e))?;
        }
    }

    Ok(())
}

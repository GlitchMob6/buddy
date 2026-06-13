/// Resource service — stub. Real implementation in Module A2.
///
/// CRUD for registered resources, OS scanning, task-resource assignments.

use rusqlite::Connection;
use crate::models::resource::{RegisterResourcePayload, Resource, ResourceType};

pub fn row_to_resource(row: &rusqlite::Row) -> rusqlite::Result<Resource> {
    Ok(Resource {
        id: row.get(0)?,
        resource_type: ResourceType::from_str(&row.get::<_, String>(1)?),
        resource_value: row.get(2)?,
        category: row.get(3)?,
        created_at: row.get(4)?,
    })
}

/// [STUB] Scan installed applications — real impl (winreg / .desktop) in Module A2.
pub fn scan(_conn: &Connection) -> Result<Vec<Resource>, String> {
    Ok(vec![])
}

pub fn register(conn: &Connection, payload: RegisterResourcePayload) -> Result<Resource, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    let category = payload.category.unwrap_or_else(|| "Other".to_string());

    conn.execute(
        "INSERT INTO registered_resources (id, resource_type, resource_value, category, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, payload.resource_type, payload.resource_value, category, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Resource {
        id,
        resource_type: ResourceType::from_str(&payload.resource_type),
        resource_value: payload.resource_value,
        category,
        created_at: now,
    })
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM registered_resources WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn list(conn: &Connection, category_filter: Option<String>) -> Result<Vec<Resource>, String> {
    if let Some(cat) = category_filter {
        let mut stmt = conn
            .prepare(
                "SELECT id, resource_type, resource_value, category, created_at
                 FROM registered_resources WHERE category = ?1 ORDER BY resource_value ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map(rusqlite::params![cat], row_to_resource)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        rows
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT id, resource_type, resource_value, category, created_at
                 FROM registered_resources ORDER BY category ASC, resource_value ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], row_to_resource)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        rows
    }
}

pub fn assign_to_task(conn: &Connection, task_id: &str, resource_id: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO task_resources (task_id, resource_id) VALUES (?1, ?2)",
        rusqlite::params![task_id, resource_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn unassign_from_task(conn: &Connection, task_id: &str, resource_id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM task_resources WHERE task_id = ?1 AND resource_id = ?2",
        rusqlite::params![task_id, resource_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_task_resources(conn: &Connection, task_id: &str) -> Result<Vec<Resource>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT r.id, r.resource_type, r.resource_value, r.category, r.created_at
             FROM registered_resources r
             JOIN task_resources tr ON tr.resource_id = r.id
             WHERE tr.task_id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![task_id], row_to_resource)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());
    rows
}

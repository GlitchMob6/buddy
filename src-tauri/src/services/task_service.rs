/// Task service — Phase 0 stub / real logic in Module A1.
///
/// CRUD and tree traversal for tasks.
/// Dev A fills this in during Module A1.

use rusqlite::Connection;
use crate::models::task::{CreateTaskPayload, Task, TaskStatus, UpdateTaskPayload};

pub fn row_to_task(row: &rusqlite::Row) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?,
        parent_id: row.get(1)?,
        title: row.get(2)?,
        description: row.get(3)?,
        priority: row.get(4)?,
        status: TaskStatus::from_str(&row.get::<_, String>(5)?),
        deadline: row.get(6)?,
        estimated_minutes: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

pub fn create(conn: &Connection, payload: CreateTaskPayload) -> Result<Task, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    let priority = payload.priority.unwrap_or(5).clamp(1, 10);
    let estimated_minutes = payload.estimated_minutes.unwrap_or(30);

    conn.execute(
        "INSERT INTO tasks (id, parent_id, title, description, priority, estimated_minutes, deadline, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
        rusqlite::params![
            id, payload.parent_id, payload.title, payload.description,
            priority, estimated_minutes, payload.deadline, now
        ],
    )
    .map_err(|e| e.to_string())?;

    fetch(conn, &id)
}

pub fn fetch(conn: &Connection, id: &str) -> Result<Task, String> {
    conn.query_row(
        "SELECT id, parent_id, title, description, priority, status, deadline,
                estimated_minutes, created_at, updated_at FROM tasks WHERE id = ?1",
        rusqlite::params![id],
        row_to_task,
    )
    .map_err(|e| format!("Task not found: {}", e))
}

pub fn list_all(conn: &Connection) -> Result<Vec<Task>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, parent_id, title, description, priority, status, deadline,
                    estimated_minutes, created_at, updated_at FROM tasks ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], row_to_task)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());
    rows
}

pub fn update(conn: &Connection, payload: UpdateTaskPayload) -> Result<Task, String> {
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();

    let mut sets: Vec<String> = vec!["updated_at = ?1".to_string()];
    let mut idx = 2usize;

    macro_rules! maybe_set {
        ($field:expr, $val:expr) => {
            if $val.is_some() {
                sets.push(format!("{} = ?{}", $field, idx));
                idx += 1;
            }
        };
    }

    maybe_set!("title", &payload.title);
    maybe_set!("parent_id", &payload.parent_id);
    maybe_set!("description", &payload.description);
    maybe_set!("priority", &payload.priority);
    maybe_set!("status", &payload.status);
    maybe_set!("deadline", &payload.deadline);
    maybe_set!("estimated_minutes", &payload.estimated_minutes);

    let sql = format!(
        "UPDATE tasks SET {} WHERE id = ?{}",
        sets.join(", "),
        idx
    );

    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now)];
    if let Some(v) = &payload.title { params.push(Box::new(v.clone())); }
    if let Some(v) = &payload.parent_id { params.push(Box::new(v.clone())); }
    if let Some(v) = &payload.description { params.push(Box::new(v.clone())); }
    if let Some(v) = payload.priority { params.push(Box::new(v)); }
    if let Some(v) = &payload.status { params.push(Box::new(v.clone())); }
    if let Some(v) = &payload.deadline { params.push(Box::new(v.clone())); }
    if let Some(v) = payload.estimated_minutes { params.push(Box::new(v)); }
    params.push(Box::new(payload.id.clone()));

    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| e.to_string())?;

    fetch(conn, &payload.id)
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM tasks WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

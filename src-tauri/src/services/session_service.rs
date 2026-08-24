/// Session service — real Session Engine (Module B1a).
///
/// Replaces Phase 0 pseudo session logic with:
///   - Task scheduling via session_tasks table
///   - Revision logging for all mid-session edits
///   - Task history creation on session start
///   - Blueprint generation integration

use rusqlite::Connection;
use crate::models::session::{Session, SessionStatus, SessionTask, BlueprintResponse};
use crate::models::task::Task;
use crate::services::scheduling_service;
use crate::services::task_service;

// ── Row mapper ────────────────────────────────────────────────────────────────

pub fn row_to_session(row: &rusqlite::Row) -> rusqlite::Result<Session> {
    Ok(Session {
        id: row.get(0)?,
        name: row.get(1)?,
        start_time: row.get(2)?,
        end_time: row.get(3)?,
        status: SessionStatus::from_str(&row.get::<_, String>(4)?),
        created_at: row.get(5)?,
        completed_at: row.get(6)?,
    })
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

pub fn fetch_session(conn: &Connection, id: &str) -> Result<Session, String> {
    conn.query_row(
        "SELECT id, name, start_time, end_time, status, created_at, completed_at
         FROM sessions WHERE id = ?1",
        rusqlite::params![id],
        row_to_session,
    )
    .map_err(|e| format!("Session not found: {}", e))
}

// ── Revision logging ──────────────────────────────────────────────────────────

fn log_revision(
    conn: &Connection,
    session_id: &str,
    revision_type: &str,
    old_value: Option<&str>,
    new_value: Option<&str>,
) -> Result<(), String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    conn.execute(
        "INSERT INTO session_revisions (id, session_id, revision_type, old_value, new_value, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, session_id, revision_type, old_value, new_value, now],
    )
    .map_err(|e| format!("Failed to log revision: {}", e))?;
    Ok(())
}

// ── Service functions ─────────────────────────────────────────────────────────

/// Create a session in 'planned' status.
/// If task_ids are provided, inserts rows into session_tasks.
pub fn create(
    conn: &Connection,
    name: Option<String>,
    task_ids: Vec<String>,
    allocated_minutes: Vec<i32>,
) -> Result<Session, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();

    conn.execute(
        "INSERT INTO sessions (id, name, status, created_at) VALUES (?1, ?2, 'planned', ?3)",
        rusqlite::params![id, name, now],
    )
    .map_err(|e| e.to_string())?;

    // Insert session tasks if provided
    for (i, task_id) in task_ids.iter().enumerate() {
        let minutes = allocated_minutes.get(i).copied().unwrap_or(30);
        conn.execute(
            "INSERT INTO session_tasks (session_id, task_id, task_order, allocated_minutes)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![id, task_id, i as i32, minutes],
        )
        .map_err(|e| format!("Failed to insert session task: {}", e))?;
    }

    fetch_session(conn, &id)
}

/// Transition to 'active'. Enforces single-active-session.
/// Creates initial task_history entries for scheduled tasks.
pub fn start(conn: &Connection, id: &str) -> Result<Session, String> {
    let active_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sessions WHERE status = 'active'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if active_count > 0 {
        return Err(
            "Another session is already active. Complete or abandon it first.".to_string(),
        );
    }

    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    conn.execute(
        "UPDATE sessions SET status = 'active', start_time = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Create task_history entries for all scheduled tasks
    let session_tasks = get_session_tasks(conn, id)?;
    for st in &session_tasks {
        // Get the task's estimated_minutes
        let estimated: i32 = conn
            .query_row(
                "SELECT estimated_minutes FROM tasks WHERE id = ?1",
                rusqlite::params![st.task_id],
                |row| row.get(0),
            )
            .unwrap_or(30);

        let hist_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO task_history (id, task_id, session_id, estimated_minutes, started_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![hist_id, st.task_id, id, estimated, now],
        )
        .map_err(|e| format!("Failed to create task history: {}", e))?;
    }

    fetch_session(conn, id)
}

/// Transition 'active' → 'paused'.
pub fn pause(conn: &Connection, id: &str) -> Result<Session, String> {
    conn.execute(
        "UPDATE sessions SET status = 'paused' WHERE id = ?1 AND status = 'active'",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    fetch_session(conn, id)
}

/// Transition 'paused' → 'active'.
pub fn resume(conn: &Connection, id: &str) -> Result<Session, String> {
    conn.execute(
        "UPDATE sessions SET status = 'active' WHERE id = ?1 AND status = 'paused'",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    fetch_session(conn, id)
}

/// Mark session 'completed', record timestamps.
pub fn complete(conn: &Connection, id: &str) -> Result<Session, String> {
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    conn.execute(
        "UPDATE sessions SET status = 'completed', end_time = ?1, completed_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Mark all unfinished task_history entries as finished
    conn.execute(
        "UPDATE task_history SET finished_at = ?1 WHERE session_id = ?2 AND finished_at IS NULL",
        rusqlite::params![now, id],
    )
    .map_err(|e| format!("Failed to finalize task history: {}", e))?;

    fetch_session(conn, id)
}

/// Mark session 'abandoned'.
pub fn abandon(conn: &Connection, id: &str) -> Result<Session, String> {
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    conn.execute(
        "UPDATE sessions SET status = 'abandoned', end_time = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // Mark unfinished task_history as finished
    conn.execute(
        "UPDATE task_history SET finished_at = ?1 WHERE session_id = ?2 AND finished_at IS NULL",
        rusqlite::params![now, id],
    )
    .map_err(|e| format!("Failed to finalize task history: {}", e))?;

    fetch_session(conn, id)
}

/// Returns the currently active session, or None.
pub fn get_active(conn: &Connection) -> Result<Option<Session>, String> {
    let result = conn.query_row(
        "SELECT id, name, start_time, end_time, status, created_at, completed_at
         FROM sessions WHERE status = 'active' LIMIT 1",
        [],
        row_to_session,
    );
    match result {
        Ok(s) => Ok(Some(s)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// List sessions, optionally filtered by status.
pub fn list(conn: &Connection, status_filter: Option<String>) -> Result<Vec<Session>, String> {
    if let Some(filter) = status_filter {
        let mut stmt = conn
            .prepare(
                "SELECT id, name, start_time, end_time, status, created_at, completed_at
                 FROM sessions WHERE status = ?1 ORDER BY created_at DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map(rusqlite::params![filter], row_to_session)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        rows
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT id, name, start_time, end_time, status, created_at, completed_at
                 FROM sessions ORDER BY created_at DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], row_to_session)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        rows
    }
}

// ── Session Tasks CRUD ────────────────────────────────────────────────────────

/// Add a task to a session. Logs a revision.
pub fn add_session_task(
    conn: &Connection,
    session_id: &str,
    task_id: &str,
    allocated_minutes: i32,
) -> Result<(), String> {
    // Determine next task_order
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(task_order), -1) FROM session_tasks WHERE session_id = ?1",
            rusqlite::params![session_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO session_tasks (session_id, task_id, task_order, allocated_minutes)
         VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![session_id, task_id, max_order + 1, allocated_minutes],
    )
    .map_err(|e| format!("Failed to add session task: {}", e))?;

    log_revision(
        conn,
        session_id,
        "task_added",
        None,
        Some(&format!("task_id={}, minutes={}", task_id, allocated_minutes)),
    )?;

    Ok(())
}

/// Remove a task from a session. Logs a revision.
pub fn remove_session_task(
    conn: &Connection,
    session_id: &str,
    task_id: &str,
) -> Result<(), String> {
    // Get current allocation for the revision log
    let old_minutes: i32 = conn
        .query_row(
            "SELECT allocated_minutes FROM session_tasks WHERE session_id = ?1 AND task_id = ?2",
            rusqlite::params![session_id, task_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        "DELETE FROM session_tasks WHERE session_id = ?1 AND task_id = ?2",
        rusqlite::params![session_id, task_id],
    )
    .map_err(|e| format!("Failed to remove session task: {}", e))?;

    log_revision(
        conn,
        session_id,
        "task_removed",
        Some(&format!("task_id={}, minutes={}", task_id, old_minutes)),
        None,
    )?;

    // Renumber remaining tasks to keep order contiguous
    recompact_task_order(conn, session_id)?;

    Ok(())
}

/// Reorder tasks within a session. Logs a revision.
pub fn reorder_session_tasks(
    conn: &Connection,
    session_id: &str,
    task_ids: Vec<String>,
) -> Result<(), String> {
    for (i, task_id) in task_ids.iter().enumerate() {
        conn.execute(
            "UPDATE session_tasks SET task_order = ?1 WHERE session_id = ?2 AND task_id = ?3",
            rusqlite::params![i as i32, session_id, task_id],
        )
        .map_err(|e| format!("Failed to reorder session tasks: {}", e))?;
    }

    log_revision(
        conn,
        session_id,
        "tasks_reordered",
        None,
        Some(&task_ids.join(",")),
    )?;

    Ok(())
}

/// Update the allocated minutes for a task in a session. Logs a revision.
pub fn update_task_allocation(
    conn: &Connection,
    session_id: &str,
    task_id: &str,
    new_minutes: i32,
) -> Result<(), String> {
    let old_minutes: i32 = conn
        .query_row(
            "SELECT allocated_minutes FROM session_tasks WHERE session_id = ?1 AND task_id = ?2",
            rusqlite::params![session_id, task_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        "UPDATE session_tasks SET allocated_minutes = ?1 WHERE session_id = ?2 AND task_id = ?3",
        rusqlite::params![new_minutes, session_id, task_id],
    )
    .map_err(|e| format!("Failed to update task allocation: {}", e))?;

    log_revision(
        conn,
        session_id,
        "allocation_updated",
        Some(&format!("task_id={}, minutes={}", task_id, old_minutes)),
        Some(&format!("task_id={}, minutes={}", task_id, new_minutes)),
    )?;

    Ok(())
}

/// Get all session tasks for a session, ordered by task_order.
pub fn get_session_tasks(conn: &Connection, session_id: &str) -> Result<Vec<SessionTask>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT session_id, task_id, task_order, allocated_minutes
             FROM session_tasks WHERE session_id = ?1 ORDER BY task_order ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params![session_id], |row| {
            Ok(SessionTask {
                session_id: row.get(0)?,
                task_id: row.get(1)?,
                task_order: row.get(2)?,
                allocated_minutes: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());
    rows
}

/// Re-compact task_order after a removal so there are no gaps (0,1,2,...).
fn recompact_task_order(conn: &Connection, session_id: &str) -> Result<(), String> {
    let tasks = get_session_tasks(conn, session_id)?;
    for (i, st) in tasks.iter().enumerate() {
        conn.execute(
            "UPDATE session_tasks SET task_order = ?1 WHERE session_id = ?2 AND task_id = ?3",
            rusqlite::params![i as i32, session_id, st.task_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Blueprint generation ──────────────────────────────────────────────────────

/// Generate a blueprint for a set of task IDs and a total session duration.
/// Fetches full Task objects from the DB, then delegates to scheduling_service.
pub fn generate_blueprint(
    conn: &Connection,
    task_ids: Vec<String>,
    total_minutes: i32,
) -> Result<BlueprintResponse, String> {
    let mut tasks: Vec<Task> = Vec::new();
    for tid in &task_ids {
        match task_service::fetch(conn, tid) {
            Ok(t) => tasks.push(t),
            Err(e) => return Err(format!("Task {} not found: {}", tid, e)),
        }
    }

    Ok(scheduling_service::generate_blueprint(&tasks, total_minutes))
}

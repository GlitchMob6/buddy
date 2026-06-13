/// Session service — Phase 0 pseudo session logic.
///
/// Contains the actual business logic extracted from session_commands.
/// Commands call into this service; Dev B replaces internals here in Module B1
/// without touching command signatures.

use rusqlite::Connection;
use crate::models::session::{Session, SessionStatus};

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

// ── Service functions ─────────────────────────────────────────────────────────

/// Create a session in 'planned' status.
pub fn create(conn: &Connection, name: Option<String>) -> Result<Session, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();

    conn.execute(
        "INSERT INTO sessions (id, name, status, created_at) VALUES (?1, ?2, 'planned', ?3)",
        rusqlite::params![id, name, now],
    )
    .map_err(|e| e.to_string())?;

    fetch_session(conn, &id)
}

/// Transition to 'active'. Enforces single-active-session.
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

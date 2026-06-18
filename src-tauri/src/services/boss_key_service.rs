/// Boss Key service — tracks exits per session, enforces 2-free-exit policy.
///
/// Uses the `boss_key_usage` table from the DB schema (already created by migrations).

use rusqlite::Connection;
use uuid::Uuid;
use chrono::Utc;
use crate::models::boss_key::{BossKeyResult, BossKeyUsage, BossKeyReason};

const FREE_EXITS_PER_SESSION: i32 = 2;

/// Record a boss key usage. Returns a BossKeyResult with free exit / penalty info.
pub fn use_boss_key(conn: &Connection, session_id: &str, reason: &str) -> Result<BossKeyResult, String> {
    let usage_count = get_boss_key_count(conn, session_id);
    let free_exit_used = usage_count < FREE_EXITS_PER_SESSION;
    let penalty_applied = !free_exit_used;
    let free_exits_remaining = (FREE_EXITS_PER_SESSION - usage_count - 1).max(0);

    let id = Uuid::new_v4().to_string();
    let timestamp = Utc::now().to_rfc3339();
    let boss_reason = BossKeyReason::from_str(reason);

    conn.execute(
        "INSERT INTO boss_key_usage (id, session_id, timestamp, reason, free_exit_used, penalty_applied)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            id,
            session_id,
            timestamp,
            boss_reason.to_string(),
            if free_exit_used { 1 } else { 0 },
            if penalty_applied { 1 } else { 0 },
        ],
    ).map_err(|e| format!("Failed to log boss key usage: {}", e))?;

    let usage = BossKeyUsage {
        id,
        session_id: session_id.to_string(),
        timestamp,
        reason: boss_reason,
        free_exit_used,
        penalty_applied,
    };

    Ok(BossKeyResult {
        usage,
        free_exit_used,
        penalty_applied,
        free_exits_remaining,
    })
}

/// Get boss key usage count for a session.
pub fn get_boss_key_count(conn: &Connection, session_id: &str) -> i32 {
    conn.query_row(
        "SELECT COUNT(*) FROM boss_key_usage WHERE session_id = ?1",
        rusqlite::params![session_id],
        |row| row.get(0),
    ).unwrap_or(0)
}

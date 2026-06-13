/// All CREATE TABLE statements for Buddy.
/// Executed once at startup via `create_all_tables`.
pub const SCHEMA_SQL: &str = r#"
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 5 CHECK(priority BETWEEN 1 AND 10),
    status TEXT NOT NULL DEFAULT 'todo'
        CHECK(status IN ('todo','in_progress','completed','archived')),
    deadline TEXT,
    estimated_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT,
    start_time TEXT,
    end_time TEXT,
    status TEXT NOT NULL DEFAULT 'planned'
        CHECK(status IN ('planned','active','paused','completed','abandoned')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS session_revisions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    revision_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS registered_resources (
    id TEXT PRIMARY KEY,
    resource_type TEXT NOT NULL
        CHECK(resource_type IN ('APPLICATION','FOLDER','DOMAIN','URL')),
    resource_value TEXT NOT NULL,
    category TEXT DEFAULT 'Other',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_resources (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    resource_id TEXT NOT NULL REFERENCES registered_resources(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, resource_id)
);

CREATE TABLE IF NOT EXISTS session_tasks (
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    task_order INTEGER NOT NULL,
    allocated_minutes INTEGER NOT NULL,
    PRIMARY KEY (session_id, task_id)
);

CREATE TABLE IF NOT EXISTS monitoring_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    value TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS violations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    resource TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    resolved INTEGER NOT NULL DEFAULT 0,
    false_positive INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS boss_key_usage (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    reason TEXT NOT NULL CHECK(reason IN ('Emergency','Meeting','Accidental','Other')),
    free_exit_used INTEGER NOT NULL DEFAULT 1,
    penalty_applied INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS task_history (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    completed INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT,
    user_feedback TEXT CHECK(user_feedback IN ('Easy','Expected','Hard','Frustrating'))
);

CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    active_resource TEXT,
    active_window_title TEXT,
    keystrokes_per_min REAL,
    mouse_distance_per_min REAL,
    idle_seconds INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_model (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    focus_score REAL DEFAULT 50.0,
    average_focus_duration REAL DEFAULT 45.0,
    average_distraction_interval REAL DEFAULT 30.0,
    completion_rate REAL DEFAULT 0.0,
    average_estimation_accuracy REAL DEFAULT 1.0,
    average_session_length REAL DEFAULT 60.0,
    preferred_work_window TEXT DEFAULT 'Evening',
    violation_profile TEXT DEFAULT 'Medium',
    boss_key_usage_count INTEGER DEFAULT 0,
    most_common_distractions TEXT DEFAULT '[]',
    task_preference_profile TEXT DEFAULT '{}',
    schedule_adherence REAL DEFAULT 1.0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed user_model row (single-row table)
INSERT OR IGNORE INTO user_model (id) VALUES (1);
"#;

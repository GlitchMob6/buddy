mod commands;
mod db;
mod models;
mod services;

use db::connection::{db_path, open, DbConnection};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["ctrl+shift+x"])
                .unwrap()
                .with_handler(|app, _shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        let db = app.state::<DbConnection>();
                        let conn = db.0.lock().unwrap();
                        // Look up the active session for proper boss key logging
                        let session_id: String = conn.query_row(
                            "SELECT id FROM sessions WHERE status = 'active' LIMIT 1",
                            [],
                            |row| row.get(0),
                        ).unwrap_or_else(|_| "no-session".to_string());
                        let _ = crate::services::boss_key_service::use_boss_key(&conn, &session_id, "Other");
                        
                        if session_id != "no-session" {
                            let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
                            let _ = conn.execute(
                                "UPDATE sessions SET status = 'abandoned', end_time = ?1 WHERE id = ?2",
                                rusqlite::params![now, session_id],
                            );
                            use tauri::Emitter;
                            let _ = app.emit("session-abandoned", ());
                        }
                        
                        drop(conn);
                        let _ = crate::services::workspace_service::exit_workspace(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Open (or create) the SQLite DB and run all migrations
            let path = db_path(app.handle());
            let conn = open(&path).expect("Failed to open SQLite database");
            
            // Deactivate any currently active sessions on app startup
            let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
            let _ = conn.execute(
                "UPDATE sessions SET status = 'abandoned', end_time = ?1 WHERE status = 'active'",
                rusqlite::params![now],
            );
            
            app.manage(DbConnection(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // ── Task commands ──────────────────────────────────────────
            commands::task_commands::create_task,
            commands::task_commands::get_task_tree,
            commands::task_commands::get_task,
            commands::task_commands::update_task,
            commands::task_commands::delete_task,
            commands::task_commands::reorder_tasks,
            // ── Session commands (real Session Engine B1a) ────────────────
            commands::session_commands::create_session,
            commands::session_commands::start_session,
            commands::session_commands::pause_session,
            commands::session_commands::resume_session,
            commands::session_commands::complete_session,
            commands::session_commands::abandon_session,
            commands::session_commands::get_active_session,
            commands::session_commands::get_sessions,
            commands::session_commands::add_session_task,
            commands::session_commands::remove_session_task,
            commands::session_commands::reorder_session_tasks,
            commands::session_commands::update_task_allocation,
            commands::session_commands::get_session_tasks,
            commands::session_commands::generate_session_blueprint,
            // ── Resource commands ──────────────────────────────────────
            commands::resource_commands::scan_resources,
            commands::resource_commands::register_resource,
            commands::resource_commands::delete_resource,
            commands::resource_commands::get_resources,
            commands::resource_commands::update_resource_category,
            commands::resource_commands::assign_resource_to_task,
            commands::resource_commands::unassign_resource_from_task,
            commands::resource_commands::get_task_resources,
            commands::resource_commands::discover_apps,
            commands::resource_commands::update_resource_role,
            // ── Monitoring commands (stubs) ────────────────────────────
            commands::monitoring_commands::start_monitoring,
            commands::monitoring_commands::stop_monitoring,
            commands::monitoring_commands::get_session_violations,
            commands::monitoring_commands::mark_false_positive,
            commands::monitoring_commands::get_activity_log,
            // ── Workspace commands (stubs) ─────────────────────────────
            commands::workspace_commands::create_workspace,
            commands::workspace_commands::get_session_workspaces,
            commands::workspace_commands::switch_workspace,
            commands::workspace_commands::destroy_workspace,
            commands::workspace_commands::launch_resource,
            commands::workspace_commands::enter_workspace,
            commands::workspace_commands::exit_workspace,
            // ── Boss Key commands ──────────────────────────────────────
            commands::boss_key_commands::use_boss_key,
            commands::boss_key_commands::get_boss_key_usage,
            // ── User Model commands ────────────────────────────────────
            commands::user_model_commands::get_user_model,
            commands::user_model_commands::recompute_user_model,
            commands::user_model_commands::get_focus_score_history,
            // ── AI commands (stubs) ────────────────────────────────────
            commands::ai_commands::generate_subtasks,
            commands::ai_commands::accept_subtasks,
            commands::ai_commands::configure_ai_provider,
            commands::ai_commands::get_ai_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running buddy");
}

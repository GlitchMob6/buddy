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
        .setup(|app| {
            // Open (or create) the SQLite DB and run all migrations
            let path = db_path(app.handle());
            let conn = open(&path).expect("Failed to open SQLite database");
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
            // ── Session commands (pseudo + stubs) ──────────────────────
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

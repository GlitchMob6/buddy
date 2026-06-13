/// AI IPC commands — thin adapters over ai_service.
/// All stubs until Module B2.

use tauri::State;
use crate::db::connection::DbConnection;
use serde::{Deserialize, Serialize};
use crate::services::ai_service as svc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtaskSuggestion {
    pub temp_id: String,
    pub title: String,
    pub estimated_minutes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub provider: String, // "byok" | "ollama" | "none"
    pub endpoint: Option<String>,
    pub model: Option<String>,
    pub configured: bool,
}

#[tauri::command]
pub fn generate_subtasks(_task_id: String, _provider: Option<String>, _db: State<DbConnection>) -> Result<Vec<SubtaskSuggestion>, String> {
    // stub — real impl fetches task then calls svc::generate_subtasks
    Ok(vec![])
}

#[tauri::command]
pub fn accept_subtasks(_task_id: String, _subtask_ids: Vec<String>, _db: State<DbConnection>) -> Result<Vec<crate::models::task::Task>, String> {
    svc::accept_subtasks(&_task_id, _subtask_ids)
}

#[tauri::command]
pub fn configure_ai_provider(
    _provider_type: String,
    _endpoint: Option<String>,
    _api_key: Option<String>,
    _model: Option<String>,
    _db: State<DbConnection>,
) -> Result<(), String> {
    svc::configure(&_provider_type, _endpoint, _api_key, _model)
}

#[tauri::command]
pub fn get_ai_config(_db: State<DbConnection>) -> Result<AiConfig, String> {
    svc::get_config()
}

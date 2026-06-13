/// AI service — stub. Real implementation in Module B2.
///
/// AiProvider trait: BYOK (OpenAI-compatible) and Ollama.
/// Generates subtask suggestions from a parent task via structured prompts.

use crate::commands::ai_commands::{AiConfig, SubtaskSuggestion};
use crate::models::task::Task;

/// [STUB] Generate subtask suggestions for a task.
/// Real impl: calls configured AI provider (BYOK or Ollama).
pub fn generate_subtasks(_task: &Task, _provider: Option<&str>) -> Result<Vec<SubtaskSuggestion>, String> {
    Ok(vec![]) // stub
}

/// [STUB] Accept selected subtasks and create them as real tasks.
/// Real impl: calls task_service::create for each accepted suggestion.
pub fn accept_subtasks(_task_id: &str, _subtask_ids: Vec<String>) -> Result<Vec<Task>, String> {
    Ok(vec![]) // stub
}

/// [STUB] Persist AI provider configuration to the settings table.
pub fn configure(
    _provider_type: &str,
    _endpoint: Option<String>,
    _api_key: Option<String>,
    _model: Option<String>,
) -> Result<(), String> {
    Ok(()) // stub
}

/// [STUB] Read current AI configuration from the settings table.
pub fn get_config() -> Result<AiConfig, String> {
    Ok(AiConfig {
        provider: "none".to_string(),
        endpoint: None,
        model: None,
        configured: false,
    })
}

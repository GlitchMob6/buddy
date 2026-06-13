/// Workspace service — stub. Real implementation in Module A4.
///
/// Session-scoped workspace creation, switching, and resource enforcement.

use crate::models::settings::Workspace;

/// [STUB] Create a workspace tied to a session.
pub fn create(_session_id: &str, _name: Option<String>) -> Result<Workspace, String> {
    Err("Not implemented yet — Module A4".to_string())
}

/// [STUB] Get all workspaces for a session.
pub fn list(_session_id: &str) -> Result<Vec<Workspace>, String> {
    Ok(vec![])
}

/// [STUB] Switch the active workspace.
pub fn switch(_workspace_id: &str) -> Result<(), String> {
    Ok(())
}

/// [STUB] Destroy a workspace.
pub fn destroy(_workspace_id: &str) -> Result<(), String> {
    Ok(())
}

/// [STUB] Launch a registered resource (open app/URL/folder).
pub fn launch_resource(_resource_id: &str) -> Result<(), String> {
    Ok(())
}

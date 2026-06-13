/// Services layer — business logic lives here.
/// Commands are thin IPC adapters that call into services.
///
/// Phase 0: session_service contains the real pseudo session logic.
/// All other services are stubs — real implementations come in their respective modules.

pub mod session_service;
pub mod task_service;
pub mod resource_service;
pub mod monitoring_service;
pub mod workspace_service;
pub mod user_model_service;
pub mod ai_service;

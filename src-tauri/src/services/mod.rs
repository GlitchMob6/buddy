/// Services layer — business logic lives here.
/// Commands are thin IPC adapters that call into services.
///
/// Module B1a: session_service + scheduling_service implement the real Session Engine.
/// Module A2: resource_service + icon_service are real implementations.

pub mod session_service;
pub mod scheduling_service;
pub mod task_service;
pub mod resource_service;
pub mod icon_service;
pub mod monitoring_service;
pub mod workspace_service;
pub mod user_model_service;
pub mod ai_service;
pub mod boss_key_service;


use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ResourceType {
    Application,
}

impl std::fmt::Display for ResourceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "APPLICATION")
    }
}

impl ResourceType {
    pub fn from_str(_s: &str) -> Self {
        ResourceType::Application
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AppRole {
    WorkTool,    // Always allowed, counts as on-task
    Background,  // Always allowed, never flags (music, etc.)
    OnDemand,    // Allowed but flags after configurable idle time
}

impl AppRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            AppRole::WorkTool  => "work_tool",
            AppRole::Background => "background",
            AppRole::OnDemand  => "on_demand",
        }
    }
    pub fn from_str(s: &str) -> Self {
        match s {
            "background" => AppRole::Background,
            "on_demand"  => AppRole::OnDemand,
            _            => AppRole::WorkTool,
        }
    }
    /// Auto-suggest a role based on category
    pub fn suggest_for_category(category: &str) -> Self {
        match category {
            "Code" | "Terminal" | "Design" | "Productivity" => AppRole::WorkTool,
            "Media"  => AppRole::Background,
            "Browser" | "Communication" => AppRole::OnDemand,
            _ => AppRole::WorkTool,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resource {
    pub id: String,
    pub resource_type: ResourceType,
    /// The actual value: exe path, folder path, domain string, or full URL
    pub resource_value: String,
    /// Human-readable name (e.g., "Google Chrome" instead of "chrome.exe")
    pub display_name: Option<String>,
    pub category: String,
    /// Base64-encoded PNG icon data (extracted from exe on Windows)
    pub icon_data: Option<String>,
    pub app_role: AppRole,
    pub created_at: String,
}

/// A resource detected by OS scanning — NOT yet persisted.
/// Presented to the user for selection before registration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedResource {
    pub display_name: String,
    pub exe_path: String,
    pub category: String,
    /// Base64-encoded PNG icon data
    pub icon_data: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredApp {
    pub display_name: String,
    pub exe_path: String,
    pub category: String,
    pub icon_data: Option<String>,
    pub suggested_role: String,
    pub discovery_reason: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterResourcePayload {
    pub resource_value: String,
    pub display_name: Option<String>,
    pub category: Option<String>,
    pub app_role: Option<String>,
    /// Base64-encoded PNG icon data
    pub icon_data: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateResourceCategoryPayload {
    pub id: String,
    pub category: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateResourceRolePayload {
    pub id: String,
    pub app_role: String,
}

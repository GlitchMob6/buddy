use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ResourceType {
    Application,
    Folder,
    Domain,
    Url,
}

impl std::fmt::Display for ResourceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ResourceType::Application => write!(f, "APPLICATION"),
            ResourceType::Folder => write!(f, "FOLDER"),
            ResourceType::Domain => write!(f, "DOMAIN"),
            ResourceType::Url => write!(f, "URL"),
        }
    }
}

impl ResourceType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "FOLDER" => ResourceType::Folder,
            "DOMAIN" => ResourceType::Domain,
            "URL" => ResourceType::Url,
            _ => ResourceType::Application,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resource {
    pub id: String,
    pub resource_type: ResourceType,
    /// The actual value: exe path, folder path, domain string, or full URL
    pub resource_value: String,
    pub category: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterResourcePayload {
    pub resource_type: String,
    pub resource_value: String,
    pub category: Option<String>,
}

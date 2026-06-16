/// Resource service — Module A2 implementation.
///
/// CRUD for registered resources, OS app scanning (Windows + Linux),
/// auto-categorization, domain/URL validation, task-resource assignments.

use rusqlite::Connection;
use crate::models::resource::{
    RegisterResourcePayload, Resource, ResourceType, ScannedResource,
    UpdateResourceCategoryPayload, AppRole, DiscoveredApp, UpdateResourceRolePayload,
};
use crate::services::icon_service;

// ── Row mapping ────────────────────────────────────────────────────────────────

pub fn row_to_resource(row: &rusqlite::Row) -> rusqlite::Result<Resource> {
    Ok(Resource {
        id: row.get(0)?,
        resource_type: ResourceType::Application,
        resource_value: row.get(2)?,
        display_name: row.get(3)?,
        category: row.get(4)?,
        icon_data: row.get(5)?,
        app_role: AppRole::from_str(&row.get::<_, String>(6).unwrap_or_default()),
        created_at: row.get(7)?,
    })
}

// ── Auto-categorization ────────────────────────────────────────────────────────

/// Maps known executable names to Buddy categories.
fn categorize_app(exe_name: &str) -> String {
    let lower = exe_name.to_lowercase();
    // Browser
    if matches!(
        lower.as_str(),
        "chrome.exe" | "firefox.exe" | "msedge.exe" | "brave.exe"
            | "opera.exe" | "vivaldi.exe" | "arc.exe" | "safari"
            | "chromium.exe" | "waterfox.exe" | "librewolf.exe"
            | "thorium.exe" | "floorp.exe" | "zen.exe"
    ) {
        return "Browser".into();
    }
    // Code / IDE
    if matches!(
        lower.as_str(),
        "code.exe" | "code - insiders.exe" | "devenv.exe" | "idea64.exe"
            | "pycharm64.exe" | "webstorm64.exe" | "goland64.exe"
            | "clion64.exe" | "rider64.exe" | "datagrip64.exe"
            | "rustrover64.exe" | "fleet.exe"
            | "sublime_text.exe" | "notepad++.exe" | "atom.exe"
            | "cursor.exe" | "windsurf.exe" | "zed.exe"
    ) {
        return "Code".into();
    }
    // Terminal
    if matches!(
        lower.as_str(),
        "windowsterminal.exe" | "wt.exe" | "cmd.exe" | "powershell.exe"
            | "pwsh.exe" | "alacritty.exe" | "wezterm-gui.exe"
            | "hyper.exe" | "tabby.exe" | "conemu64.exe"
            | "mintty.exe" | "kitty.exe" | "iterm2"
    ) {
        return "Terminal".into();
    }
    // Communication
    if matches!(
        lower.as_str(),
        "slack.exe" | "discord.exe" | "teams.exe" | "ms-teams.exe"
            | "zoom.exe" | "telegram.exe" | "signal.exe"
            | "thunderbird.exe" | "outlook.exe"
            | "whatsapp.exe" | "element.exe" | "guilded.exe"
    ) {
        return "Communication".into();
    }
    // Media
    if matches!(
        lower.as_str(),
        "spotify.exe" | "vlc.exe" | "foobar2000.exe"
            | "itunes.exe" | "musicbee.exe" | "aimp.exe"
            | "winamp.exe" | "mpv.exe" | "mpc-hc64.exe"
    ) {
        return "Media".into();
    }
    // Design
    if matches!(
        lower.as_str(),
        "figma.exe" | "photoshop.exe" | "illustrator.exe"
            | "gimp-2.10.exe" | "inkscape.exe" | "krita.exe"
            | "blender.exe" | "afterfx.exe" | "premiere pro.exe"
    ) {
        return "Design".into();
    }
    // Productivity
    if matches!(
        lower.as_str(),
        "notion.exe" | "obsidian.exe" | "logseq.exe"
            | "onenote.exe" | "evernote.exe" | "todoist.exe"
            | "winword.exe" | "excel.exe" | "powerpnt.exe"
    ) {
        return "Productivity".into();
    }

    "Other".into()
}

// ── OS scanning ────────────────────────────────────────────────────────────────

/// Scan installed applications on Windows via the registry.
#[cfg(target_os = "windows")]
fn scan_windows_apps() -> Vec<ScannedResource> {
    use winreg::enums::*;
    use winreg::RegKey;

    let mut results: Vec<ScannedResource> = Vec::new();
    let mut seen_names: std::collections::HashSet<String> = std::collections::HashSet::new();

    let paths = [
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
    ];

    for (root, path) in paths {
        let hklm = RegKey::predef(root);
        let Ok(uninstall) = hklm.open_subkey_with_flags(path, KEY_READ) else {
            continue;
        };

        for key_name in uninstall.enum_keys().filter_map(|k| k.ok()) {
            let Ok(subkey) = uninstall.open_subkey_with_flags(&key_name, KEY_READ) else {
                continue;
            };

            // Must have a display name
            let Ok(display_name) = subkey.get_value::<String, _>("DisplayName") else {
                continue;
            };

            // Skip empty or system entries
            let name_trimmed = display_name.trim().to_string();
            if name_trimmed.is_empty() { continue; }

            // Skip entries that look like updates/patches
            let lower_name = name_trimmed.to_lowercase();
            if lower_name.contains("update for")
                || lower_name.contains("hotfix")
                || lower_name.contains("security update")
                || lower_name.contains("kb")
                || lower_name.starts_with("{")
            {
                continue;
            }

            // Skip system components
            let system_component: u32 = subkey.get_value("SystemComponent").unwrap_or(0);
            if system_component == 1 { continue; }

            // Check if we've already seen this name (dedup)
            if !seen_names.insert(name_trimmed.clone()) {
                continue;
            }

            // Try to find the exe path
            let exe_path: String = subkey
                .get_value("DisplayIcon")
                .or_else(|_| subkey.get_value::<String, _>("InstallLocation").map(|loc| {
                    let p = std::path::Path::new(&loc);
                    p.to_string_lossy().to_string()
                }))
                .unwrap_or_default();

            // Clean up icon path (remove comma+index suffix like ",0")
            let exe_clean = exe_path
                .trim_matches('"')
                .split(',')
                .next()
                .unwrap_or("")
                .trim()
                .to_string();

            // Determine exe filename for categorization
            let exe_filename = std::path::Path::new(&exe_clean)
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            let category = categorize_app(&exe_filename);

            results.push(ScannedResource {
                display_name: name_trimmed,
                exe_path: exe_clean,
                category,
                icon_data: None, // Icons extracted on registration, not during scan
            });
        }
    }

    // Sort by display name
    results.sort_by(|a, b| a.display_name.to_lowercase().cmp(&b.display_name.to_lowercase()));
    results
}

/// Scan installed applications on Linux via .desktop files.
#[cfg(target_os = "linux")]
fn scan_linux_apps() -> Vec<ScannedResource> {
    use std::fs;
    use std::path::Path;

    let mut results: Vec<ScannedResource> = Vec::new();
    let mut seen_names: std::collections::HashSet<String> = std::collections::HashSet::new();

    let dirs = [
        "/usr/share/applications",
        "/usr/local/share/applications",
    ];
    // Also add user-local directory
    let home = std::env::var("HOME").unwrap_or_default();
    let user_apps = format!("{}/.local/share/applications", home);

    let all_dirs: Vec<&str> = dirs.iter().copied().chain(std::iter::once(user_apps.as_str())).collect();

    for dir in all_dirs {
        let Ok(entries) = fs::read_dir(dir) else { continue; };

        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("desktop") {
                continue;
            }

            let Ok(content) = fs::read_to_string(&path) else { continue; };

            // Simple .desktop parser
            let mut name = String::new();
            let mut exec = String::new();
            let mut no_display = false;

            for line in content.lines() {
                let line = line.trim();
                if line.starts_with("Name=") && name.is_empty() {
                    name = line[5..].to_string();
                } else if line.starts_with("Exec=") && exec.is_empty() {
                    // Take just the binary, strip %u/%f args
                    exec = line[5..].split_whitespace().next().unwrap_or("").to_string();
                } else if line == "NoDisplay=true" {
                    no_display = true;
                }
            }

            if name.is_empty() || no_display { continue; }
            if !seen_names.insert(name.clone()) { continue; }

            let exe_filename = Path::new(&exec)
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            let category = categorize_app(&exe_filename);

            results.push(ScannedResource {
                display_name: name,
                exe_path: exec,
                category,
                icon_data: None,
            });
        }
    }

    results.sort_by(|a, b| a.display_name.to_lowercase().cmp(&b.display_name.to_lowercase()));
    results
}

/// Scan installed applications (cross-platform dispatcher).
pub fn scan(_conn: &Connection) -> Result<Vec<ScannedResource>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(scan_windows_apps())
    }
    #[cfg(target_os = "linux")]
    {
        Ok(scan_linux_apps())
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        Ok(vec![])
    }
}

// ── Validation ─────────────────────────────────────────────────────────────────

// ── Discovery ──────────────────────────────────────────────────────────────────

pub fn discover_smart_apps(conn: &Connection) -> Result<Vec<DiscoveredApp>, String> {
    let mut results: Vec<DiscoveredApp> = Vec::new();
    
    // Already registered exe paths — skip these
    let registered = list(conn, None)?;
    let registered_paths: std::collections::HashSet<String> = registered
        .iter()
        .map(|r| r.resource_value.to_lowercase())
        .collect();

    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        // ── Default browser ─────────────────────────────────────────
        if let Some(app) = detect_default_browser_windows() {
            if !registered_paths.contains(&app.exe_path.to_lowercase()) {
                results.push(app);
            }
        }

        // ── Curated popular apps ─────────────────────────────────────
        // Each entry: (registry display name hint, category, role, reason label)
        let curated: &[(&str, &str, &str, &str)] = &[
            // Terminals
            ("Windows Terminal", "Terminal", "work_tool", "Terminal"),
            ("PowerShell",       "Terminal", "work_tool", "Terminal"),
            // Editors / IDEs
            ("Visual Studio Code", "Code", "work_tool", "Code editor"),
            ("Cursor",             "Code", "work_tool", "Code editor"),
            ("Notepad++",          "Code", "work_tool", "Text editor"),
            ("Sublime Text",       "Code", "work_tool", "Text editor"),
            // Comms
            ("Discord",   "Communication", "on_demand", "Found: Discord"),
            ("Slack",     "Communication", "on_demand", "Found: Slack"),
            ("Zoom",      "Communication", "on_demand", "Found: Zoom"),
            ("Telegram",  "Communication", "on_demand", "Found: Telegram"),
            ("WhatsApp",  "Communication", "on_demand", "Found: WhatsApp"),
            // Media
            ("Spotify",   "Media", "background", "Found: Spotify"),
            ("VLC",       "Media", "background", "Found: VLC media player"),
            // Productivity
            ("Notion",    "Productivity", "work_tool", "Found: Notion"),
            ("Obsidian",  "Productivity", "work_tool", "Found: Obsidian"),
            ("Figma",     "Design",       "work_tool", "Found: Figma"),
        ];

        // Scan full registry once and match against curated list
        let all_scanned = scan_windows_apps();
        for scanned in &all_scanned {
            let lower_name = scanned.display_name.to_lowercase();
            for (hint, cat, role, reason) in curated {
                if lower_name.contains(&hint.to_lowercase()) {
                    if registered_paths.contains(&scanned.exe_path.to_lowercase()) {
                        break;
                    }
                    let icon = crate::services::icon_service::extract_icon_base64(&scanned.exe_path);
                    results.push(DiscoveredApp {
                        display_name: scanned.display_name.clone(),
                        exe_path: scanned.exe_path.clone(),
                        category: cat.to_string(),
                        icon_data: icon,
                        suggested_role: role.to_string(),
                        discovery_reason: reason.to_string(),
                    });
                    break;
                }
            }
        }
    }

    // Deduplicate by exe_path
    let mut seen = std::collections::HashSet::new();
    results.retain(|r| seen.insert(r.exe_path.to_lowercase()));

    Ok(results)
}

#[cfg(target_os = "windows")]
fn detect_default_browser_windows() -> Option<DiscoveredApp> {
    use winreg::enums::*;
    use winreg::RegKey;
    // Read ProgId for http association
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let prog_id_key = hkcu.open_subkey(
        r"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice"
    ).ok()?;
    let prog_id: String = prog_id_key.get_value("ProgId").ok()?;
    // Resolve ProgId → exe path
    let shell_key = RegKey::predef(HKEY_CLASSES_ROOT)
        .open_subkey(format!(r"{}\shell\open\command", prog_id)).ok()?;
    let cmd: String = shell_key.get_value("").ok()?;
    let exe = cmd.trim_matches('"').split('"').next()
        .unwrap_or("").split(' ').next().unwrap_or("").trim().to_string();
    if exe.is_empty() { return None; }
    
    let display_name = std::path::Path::new(&exe)
        .file_stem().unwrap_or_default()
        .to_string_lossy().to_string();
    let icon = crate::services::icon_service::extract_icon_base64(&exe);

    Some(DiscoveredApp {
        display_name: if display_name.to_lowercase().contains("chrome") { "Google Chrome".into() }
                      else if display_name.to_lowercase().contains("firefox") { "Firefox".into() }
                      else if display_name.to_lowercase().contains("msedge") { "Microsoft Edge".into() }
                      else { display_name },
        exe_path: exe,
        category: "Browser".into(),
        icon_data: icon,
        suggested_role: "on_demand".into(),
        discovery_reason: "Default browser".into(),
    })
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

pub fn register(conn: &Connection, payload: RegisterResourcePayload) -> Result<Resource, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    let category = payload.category.unwrap_or_else(|| "Other".to_string());

    // Auto-suggest role if not provided
    let role_str = payload.app_role
        .unwrap_or_else(|| AppRole::suggest_for_category(&category).as_str().to_string());

    // Extract icon for APPLICATION type if not already provided
    let icon_data = if payload.icon_data.is_none() {
        icon_service::extract_icon_base64(&payload.resource_value)
    } else {
        payload.icon_data.clone()
    };

    conn.execute(
        "INSERT INTO registered_resources (id, resource_type, resource_value, display_name, category, icon_data, app_role, created_at)
         VALUES (?1, 'APPLICATION', ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            id, payload.resource_value, payload.display_name,
            category, icon_data, role_str, now
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Resource {
        id,
        resource_type: ResourceType::Application,
        resource_value: payload.resource_value,
        display_name: payload.display_name,
        category,
        icon_data,
        app_role: AppRole::from_str(&role_str),
        created_at: now,
    })
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM registered_resources WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn list(conn: &Connection, category_filter: Option<String>) -> Result<Vec<Resource>, String> {
    if let Some(cat) = category_filter {
        let mut stmt = conn
            .prepare(
                "SELECT id, resource_type, resource_value, display_name, category, icon_data, app_role, created_at
                 FROM registered_resources WHERE category = ?1 ORDER BY resource_value ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map(rusqlite::params![cat], row_to_resource)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        rows
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT id, resource_type, resource_value, display_name, category, icon_data, app_role, created_at
                 FROM registered_resources ORDER BY category ASC, resource_value ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], row_to_resource)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        rows
    }
}

pub fn update_category(conn: &Connection, payload: UpdateResourceCategoryPayload) -> Result<Resource, String> {
    conn.execute(
        "UPDATE registered_resources SET category = ?1 WHERE id = ?2",
        rusqlite::params![payload.category, payload.id],
    )
    .map_err(|e| e.to_string())?;

    // Fetch updated row
    conn.query_row(
        "SELECT id, resource_type, resource_value, display_name, category, icon_data, app_role, created_at
         FROM registered_resources WHERE id = ?1",
        rusqlite::params![payload.id],
        row_to_resource,
    )
    .map_err(|e| format!("Resource not found: {}", e))
}

pub fn update_role(conn: &Connection, payload: UpdateResourceRolePayload) -> Result<Resource, String> {
    conn.execute(
        "UPDATE registered_resources SET app_role = ?1 WHERE id = ?2",
        rusqlite::params![payload.app_role, payload.id],
    )
    .map_err(|e| e.to_string())?;

    // Fetch updated row
    conn.query_row(
        "SELECT id, resource_type, resource_value, display_name, category, icon_data, app_role, created_at
         FROM registered_resources WHERE id = ?1",
        rusqlite::params![payload.id],
        row_to_resource,
    )
    .map_err(|e| format!("Resource not found: {}", e))
}

// ── Task-resource assignments ──────────────────────────────────────────────────

pub fn assign_to_task(conn: &Connection, task_id: &str, resource_id: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO task_resources (task_id, resource_id) VALUES (?1, ?2)",
        rusqlite::params![task_id, resource_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn unassign_from_task(conn: &Connection, task_id: &str, resource_id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM task_resources WHERE task_id = ?1 AND resource_id = ?2",
        rusqlite::params![task_id, resource_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_task_resources(conn: &Connection, task_id: &str) -> Result<Vec<Resource>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT r.id, r.resource_type, r.resource_value, r.display_name, r.category, r.icon_data, r.app_role, r.created_at
             FROM registered_resources r
             JOIN task_resources tr ON tr.resource_id = r.id
             WHERE tr.task_id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![task_id], row_to_resource)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());
    rows
}

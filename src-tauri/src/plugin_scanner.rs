use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterDescriptor {
    pub name: String,
    pub label: String,
    #[serde(rename = "type")]
    pub param_type: String,
    #[serde(default)]
    pub required: bool,
    pub description: Option<String>,
    pub default: Option<serde_json::Value>,
    pub options: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginDescriptor {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub entry: String,
    pub parameters: Vec<ParameterDescriptor>,
    #[serde(skip_deserializing)]
    pub path: String,
}

pub fn scan_plugins(plugins_dir: &PathBuf) -> Vec<PluginDescriptor> {
    let mut plugins = Vec::new();
    let Ok(entries) = std::fs::read_dir(plugins_dir) else {
        return plugins;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let json_path = path.join("plugin.json");
        if !json_path.exists() {
            continue;
        }

        let Ok(content) = std::fs::read_to_string(&json_path) else {
            continue;
        };

        let Ok(mut descriptor): Result<PluginDescriptor, _> = serde_json::from_str(&content) else {
            continue;
        };

        descriptor.path = path.to_string_lossy().to_string();
        plugins.push(descriptor);
    }

    plugins
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn make_temp_plugin(dir: &TempDir, id: &str, json: &str) {
        let plugin_dir = dir.path().join(id);
        fs::create_dir_all(&plugin_dir).unwrap();
        fs::write(plugin_dir.join("plugin.json"), json).unwrap();
    }

    #[test]
    fn scan_returns_empty_for_missing_dir() {
        let result = scan_plugins(&PathBuf::from("/nonexistent/path/12345"));
        assert!(result.is_empty());
    }

    #[test]
    fn scan_loads_valid_plugin() {
        let dir = TempDir::new().unwrap();
        make_temp_plugin(
            &dir,
            "my-plugin",
            r#"{
            "id": "my-plugin",
            "name": "My Plugin",
            "version": "1.0.0",
            "entry": "index.js",
            "parameters": [
                {"name": "foo", "label": "Foo", "type": "text"}
            ]
        }"#,
        );
        let plugins = scan_plugins(&dir.path().to_path_buf());
        assert_eq!(plugins.len(), 1);
        assert_eq!(plugins[0].id, "my-plugin");
        assert_eq!(plugins[0].parameters.len(), 1);
    }

    #[test]
    fn scan_skips_dir_without_plugin_json() {
        let dir = TempDir::new().unwrap();
        fs::create_dir_all(dir.path().join("no-json")).unwrap();
        let plugins = scan_plugins(&dir.path().to_path_buf());
        assert!(plugins.is_empty());
    }

    #[test]
    fn scan_skips_invalid_json() {
        let dir = TempDir::new().unwrap();
        make_temp_plugin(&dir, "bad-plugin", "not json");
        let plugins = scan_plugins(&dir.path().to_path_buf());
        assert!(plugins.is_empty());
    }
}

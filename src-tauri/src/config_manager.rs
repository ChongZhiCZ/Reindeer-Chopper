use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginConfig {
    pub id: String,
    pub name: String,
    pub params: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct PluginConfigFile {
    pub deps_installed: bool,
    pub configs: Vec<PluginConfig>,
}

fn config_file(configs_dir: &PathBuf, plugin_id: &str) -> PathBuf {
    configs_dir.join(format!("{}.json", plugin_id))
}

fn load_config_file(configs_dir: &PathBuf, plugin_id: &str) -> PluginConfigFile {
    let path = config_file(configs_dir, plugin_id);
    let Ok(content) = std::fs::read_to_string(&path) else {
        return PluginConfigFile::default();
    };
    serde_json::from_str(&content).unwrap_or_default()
}

fn save_config_file(configs_dir: &PathBuf, plugin_id: &str, file: &PluginConfigFile) -> Result<(), String> {
    std::fs::create_dir_all(configs_dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(file).map_err(|e| e.to_string())?;
    std::fs::write(config_file(configs_dir, plugin_id), json).map_err(|e| e.to_string())
}

pub fn load_configs(configs_dir: &PathBuf, plugin_id: &str) -> Vec<PluginConfig> {
    load_config_file(configs_dir, plugin_id).configs
}

pub fn is_deps_installed(configs_dir: &PathBuf, plugin_id: &str) -> bool {
    load_config_file(configs_dir, plugin_id).deps_installed
}

pub fn mark_deps_installed(
    configs_dir: &PathBuf,
    plugin_id: &str,
    deps_installed: bool,
) -> Result<(), String> {
    let mut file = load_config_file(configs_dir, plugin_id);
    file.deps_installed = deps_installed;
    save_config_file(configs_dir, plugin_id, &file)
}

pub fn save_config(
    configs_dir: &PathBuf,
    plugin_id: &str,
    config: PluginConfig,
) -> Result<(), String> {
    let mut file = load_config_file(configs_dir, plugin_id);
    if let Some(existing) = file.configs.iter_mut().find(|c| c.id == config.id) {
        *existing = config;
    } else {
        file.configs.push(config);
    }
    save_config_file(configs_dir, plugin_id, &file)
}

pub fn delete_config(
    configs_dir: &PathBuf,
    plugin_id: &str,
    config_id: &str,
) -> Result<(), String> {
    let mut file = load_config_file(configs_dir, plugin_id);
    file.configs.retain(|c| c.id != config_id);
    save_config_file(configs_dir, plugin_id, &file)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn make_config(id: &str, name: &str) -> PluginConfig {
        PluginConfig {
            id: id.to_string(),
            name: name.to_string(),
            params: HashMap::new(),
        }
    }

    #[test]
    fn load_returns_empty_for_missing_file() {
        let dir = TempDir::new().unwrap();
        let configs = load_configs(&dir.path().to_path_buf(), "no-plugin");
        assert!(configs.is_empty());
    }

    #[test]
    fn save_and_load_config() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_path_buf();
        save_config(&path, "my-plugin", make_config("uuid-1", "Test")).unwrap();
        let configs = load_configs(&path, "my-plugin");
        assert_eq!(configs.len(), 1);
        assert_eq!(configs[0].name, "Test");
    }

    #[test]
    fn save_updates_existing_config() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_path_buf();
        save_config(&path, "p", make_config("uuid-1", "Old")).unwrap();
        save_config(&path, "p", make_config("uuid-1", "New")).unwrap();
        let configs = load_configs(&path, "p");
        assert_eq!(configs.len(), 1);
        assert_eq!(configs[0].name, "New");
    }

    #[test]
    fn delete_config_removes_by_id() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_path_buf();
        save_config(&path, "p", make_config("uuid-1", "A")).unwrap();
        save_config(&path, "p", make_config("uuid-2", "B")).unwrap();
        delete_config(&path, "p", "uuid-1").unwrap();
        let configs = load_configs(&path, "p");
        assert_eq!(configs.len(), 1);
        assert_eq!(configs[0].id, "uuid-2");
    }

    #[test]
    fn mark_deps_installed_persists() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_path_buf();
        assert!(!is_deps_installed(&path, "p"));
        mark_deps_installed(&path, "p", true).unwrap();
        assert!(is_deps_installed(&path, "p"));
    }
}

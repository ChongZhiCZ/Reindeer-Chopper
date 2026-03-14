use crate::plugin_scanner::{validate_plugin_descriptor, PluginDescriptor};
use std::fs;
use std::path::{Path, PathBuf};

fn ensure_safe_plugin_id(plugin_id: &str) -> Result<(), String> {
    if plugin_id.is_empty() {
        return Err("Plugin id cannot be empty".to_string());
    }

    if plugin_id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        Ok(())
    } else {
        Err("Plugin id must contain only letters, numbers, '-' or '_'".to_string())
    }
}

fn load_descriptor(plugin_dir: &Path) -> Result<PluginDescriptor, String> {
    let descriptor_path = plugin_dir.join("plugin.json");
    if !descriptor_path.exists() {
        return Err("plugin.json not found in source directory".to_string());
    }

    let content = fs::read_to_string(&descriptor_path)
        .map_err(|e| format!("Failed to read plugin.json: {e}"))?;
    let mut descriptor: PluginDescriptor =
        serde_json::from_str(&content).map_err(|e| format!("Invalid plugin.json: {e}"))?;
    validate_plugin_descriptor(&descriptor).map_err(|e| format!("Invalid plugin.json: {e}"))?;

    ensure_safe_plugin_id(&descriptor.id)?;
    descriptor.path = plugin_dir.to_string_lossy().to_string();
    Ok(descriptor)
}

fn copy_dir_recursive(source: &Path, target: &Path) -> Result<(), String> {
    fs::create_dir_all(target).map_err(|e| format!("Failed to create directory: {e}"))?;

    let entries =
        fs::read_dir(source).map_err(|e| format!("Failed to read source directory: {e}"))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {e}"))?;
        let src_path = entry.path();
        let dst_path = target.join(entry.file_name());
        let file_type = entry
            .file_type()
            .map_err(|e| format!("Failed to read file type: {e}"))?;

        if file_type.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
            continue;
        }

        if file_type.is_file() {
            fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("Failed to copy file {}: {e}", src_path.display()))?;
            continue;
        }

        return Err(format!(
            "Unsupported file type while importing: {}",
            src_path.display()
        ));
    }

    Ok(())
}

pub fn import_plugin(
    plugins_dir: &PathBuf,
    source_dir: &PathBuf,
) -> Result<PluginDescriptor, String> {
    if !source_dir.exists() {
        return Err("Source plugin directory does not exist".to_string());
    }
    if !source_dir.is_dir() {
        return Err("Source path must be a directory".to_string());
    }

    let mut descriptor = load_descriptor(source_dir)?;

    fs::create_dir_all(plugins_dir)
        .map_err(|e| format!("Failed to create plugins directory: {e}"))?;

    let target_dir = plugins_dir.join(&descriptor.id);
    if target_dir.exists() {
        return Err(format!("Plugin id '{}' already exists", descriptor.id));
    }

    copy_dir_recursive(source_dir, &target_dir)?;
    descriptor.path = target_dir.to_string_lossy().to_string();
    Ok(descriptor)
}

pub fn uninstall_plugin(
    plugins_dir: &PathBuf,
    configs_dir: &PathBuf,
    plugin_id: &str,
    remove_configs: bool,
) -> Result<(), String> {
    ensure_safe_plugin_id(plugin_id)?;

    let plugin_dir = plugins_dir.join(plugin_id);
    if !plugin_dir.exists() {
        return Err(format!("Plugin '{}' not found", plugin_id));
    }

    fs::remove_dir_all(&plugin_dir).map_err(|e| {
        format!(
            "Failed to remove plugin directory {}: {e}",
            plugin_dir.display()
        )
    })?;

    if remove_configs {
        let config_file = configs_dir.join(format!("{}.json", plugin_id));
        if config_file.exists() {
            fs::remove_file(&config_file).map_err(|e| {
                format!(
                    "Failed to remove config file {}: {e}",
                    config_file.display()
                )
            })?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn write_plugin(dir: &Path, id: &str, name: &str) {
        fs::create_dir_all(dir).unwrap();
        fs::write(
            dir.join("plugin.json"),
            format!(
                r#"{{
  "id": "{id}",
  "name": "{name}",
  "version": "1.0.0",
  "runtime": {{
    "windows": {{"run": "node index.js"}},
    "mac": {{"run": "node index.js"}}
  }},
  "parameters": []
}}"#
            ),
        )
        .unwrap();
        fs::write(dir.join("index.js"), "console.log('ok')").unwrap();
    }

    fn write_plugin_json(dir: &Path, json: &str) {
        fs::create_dir_all(dir).unwrap();
        fs::write(dir.join("plugin.json"), json).unwrap();
        fs::write(dir.join("index.js"), "console.log('ok')").unwrap();
    }

    #[test]
    fn import_plugin_copies_directory() {
        let temp = TempDir::new().unwrap();
        let plugins_dir = temp.path().join("plugins");
        let source_dir = temp.path().join("source-plugin");
        write_plugin(&source_dir, "sample", "Sample");

        let descriptor = import_plugin(&plugins_dir, &source_dir).unwrap();

        assert_eq!(descriptor.id, "sample");
        assert!(plugins_dir.join("sample").join("plugin.json").exists());
        assert!(plugins_dir.join("sample").join("index.js").exists());
    }

    #[test]
    fn import_plugin_rejects_duplicate_id() {
        let temp = TempDir::new().unwrap();
        let plugins_dir = temp.path().join("plugins");
        let source_a = temp.path().join("source-a");
        let source_b = temp.path().join("source-b");
        write_plugin(&source_a, "dup", "Plugin A");
        write_plugin(&source_b, "dup", "Plugin B");

        import_plugin(&plugins_dir, &source_a).unwrap();
        let result = import_plugin(&plugins_dir, &source_b);

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("Plugin id 'dup' already exists"));
    }

    #[test]
    fn import_plugin_rejects_filepath_without_path_mode() {
        let temp = TempDir::new().unwrap();
        let plugins_dir = temp.path().join("plugins");
        let source_dir = temp.path().join("bad-filepath-plugin");
        write_plugin_json(
            &source_dir,
            r#"{
  "id": "bad-filepath-plugin",
  "name": "Bad Filepath Plugin",
  "version": "1.0.0",
  "runtime": {
    "windows": {"run": "node index.js"},
    "mac": {"run": "node index.js"}
  },
  "parameters": [
    {"name": "input", "label": "Input", "type": "filepath"}
  ]
}"#,
        );

        let result = import_plugin(&plugins_dir, &source_dir);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("missing/invalid pathMode"));
    }

    #[test]
    fn uninstall_plugin_keeps_config_when_remove_configs_false() {
        let temp = TempDir::new().unwrap();
        let plugins_dir = temp.path().join("plugins");
        let configs_dir = temp.path().join("configs");
        let source_dir = temp.path().join("source-plugin");
        write_plugin(&source_dir, "remove-me", "Remove Me");

        import_plugin(&plugins_dir, &source_dir).unwrap();
        fs::create_dir_all(&configs_dir).unwrap();
        fs::write(configs_dir.join("remove-me.json"), "{}").unwrap();

        uninstall_plugin(&plugins_dir, &configs_dir, "remove-me", false).unwrap();

        assert!(!plugins_dir.join("remove-me").exists());
        assert!(configs_dir.join("remove-me.json").exists());
    }

    #[test]
    fn uninstall_plugin_removes_config_when_remove_configs_true() {
        let temp = TempDir::new().unwrap();
        let plugins_dir = temp.path().join("plugins");
        let configs_dir = temp.path().join("configs");
        let source_dir = temp.path().join("source-plugin");
        write_plugin(&source_dir, "remove-me", "Remove Me");

        import_plugin(&plugins_dir, &source_dir).unwrap();
        fs::create_dir_all(&configs_dir).unwrap();
        fs::write(configs_dir.join("remove-me.json"), "{}").unwrap();

        uninstall_plugin(&plugins_dir, &configs_dir, "remove-me", true).unwrap();

        assert!(!plugins_dir.join("remove-me").exists());
        assert!(!configs_dir.join("remove-me.json").exists());
    }

    #[test]
    fn uninstall_plugin_rejects_unsafe_id() {
        let temp = TempDir::new().unwrap();
        let plugins_dir = temp.path().join("plugins");
        let configs_dir = temp.path().join("configs");
        fs::create_dir_all(&plugins_dir).unwrap();

        let result = uninstall_plugin(&plugins_dir, &configs_dir, "../bad", false);
        assert!(result.is_err());
    }
}

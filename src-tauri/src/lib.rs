mod config_manager;
mod plugin_manager;
mod plugin_scanner;
mod pty_manager;

use config_manager::PluginConfig;
use pty_manager::PtyStore;
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;

fn app_data_dir(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().expect("app data dir")
}

#[tauri::command]
fn list_plugins(app: AppHandle) -> Vec<plugin_scanner::PluginDescriptor> {
    let dir = app_data_dir(&app).join("plugins");
    plugin_scanner::scan_plugins(&dir)
}

#[tauri::command]
fn import_plugin(
    app: AppHandle,
    source_path: String,
) -> Result<plugin_scanner::PluginDescriptor, String> {
    let plugins_dir = app_data_dir(&app).join("plugins");
    plugin_manager::import_plugin(&plugins_dir, &PathBuf::from(source_path))
}

#[tauri::command]
fn uninstall_plugin(
    app: AppHandle,
    store: State<'_, PtyStore>,
    plugin_id: String,
) -> Result<(), String> {
    if pty_manager::has_running_tasks_for_plugin(store.inner(), &plugin_id) {
        return Err("Cannot uninstall plugin while it has running tasks".to_string());
    }

    let plugins_dir = app_data_dir(&app).join("plugins");
    let configs_dir = app_data_dir(&app).join("configs");
    plugin_manager::uninstall_plugin(&plugins_dir, &configs_dir, &plugin_id)
}

#[tauri::command]
fn list_configs(app: AppHandle, plugin_id: String) -> Vec<PluginConfig> {
    let dir = app_data_dir(&app).join("configs");
    config_manager::load_configs(&dir, &plugin_id)
}

#[tauri::command]
fn save_config(app: AppHandle, plugin_id: String, config: PluginConfig) -> Result<(), String> {
    let dir = app_data_dir(&app).join("configs");
    config_manager::save_config(&dir, &plugin_id, config)
}

#[tauri::command]
fn delete_config(app: AppHandle, plugin_id: String, config_id: String) -> Result<(), String> {
    let dir = app_data_dir(&app).join("configs");
    config_manager::delete_config(&dir, &plugin_id, &config_id)
}

#[tauri::command]
async fn run_plugin(
    app: AppHandle,
    store: State<'_, PtyStore>,
    plugin_id: String,
    plugin_name: String,
    config_name: String,
    params: HashMap<String, serde_json::Value>,
    skip_install: Option<bool>,
) -> Result<String, String> {
    let plugin_dir = app_data_dir(&app).join("plugins").join(&plugin_id);

    let json_path = plugin_dir.join("plugin.json");
    let content = std::fs::read_to_string(&json_path)
        .map_err(|e| format!("Cannot read plugin.json: {}", e))?;
    let descriptor: plugin_scanner::PluginDescriptor =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let pkg_json = plugin_dir.join("package.json");
    let configs_dir = app_data_dir(&app).join("configs");
    let deps_installed = config_manager::is_deps_installed(&configs_dir, &plugin_id);

    if !skip_install.unwrap_or(false) && pkg_json.exists() && !deps_installed {
        let task_id = pty_manager::spawn(
            store.inner().clone(),
            app.clone(),
            plugin_dir.to_string_lossy().to_string(),
            vec!["npm".to_string(), "install".to_string()],
            Some(plugin_id.clone()),
            Some(format!("install-{}", Uuid::new_v4())),
        )?;
        config_manager::mark_deps_installed(&configs_dir, &plugin_id, true)?;

        let _ = app.emit(
            "npm_install_started",
            serde_json::json!({
                "taskId": task_id,
                "pluginId": plugin_id,
                "pluginName": plugin_name,
                "configName": config_name,
                "params": params,
            }),
        );

        return Ok(task_id);
    }

    let mut argv = vec!["node".to_string(), descriptor.entry.clone()];
    for param in &descriptor.parameters {
        if let Some(val) = params.get(&param.name) {
            match val {
                serde_json::Value::Bool(true) => argv.push(format!("--{}", param.name)),
                serde_json::Value::Bool(false) => {}
                serde_json::Value::Null => {}
                other => {
                    argv.push(format!("--{}", param.name));
                    argv.push(
                        other
                            .as_str()
                            .map(|s| s.to_string())
                            .unwrap_or_else(|| other.to_string()),
                    );
                }
            }
        }
    }

    let task_id = pty_manager::spawn(
        store.inner().clone(),
        app,
        plugin_dir.to_string_lossy().to_string(),
        argv,
        Some(plugin_id),
        None,
    )?;

    Ok(task_id)
}

#[tauri::command]
fn pty_input(store: State<'_, PtyStore>, task_id: String, data: String) -> Result<(), String> {
    pty_manager::write_input(store.inner(), &task_id, &data)
}

#[tauri::command]
fn kill_task(store: State<'_, PtyStore>, task_id: String) -> Result<(), String> {
    pty_manager::kill_task(store.inner(), &task_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                match app.path().app_data_dir() {
                    Ok(dir) => {
                        println!("[debug] app_data_dir = {}", dir.display());
                        println!("[debug] plugins_dir = {}", dir.join("plugins").display());
                    }
                    Err(err) => {
                        eprintln!("[debug] failed to resolve app_data_dir: {err}");
                    }
                }
            }
            Ok(())
        })
        .manage(pty_manager::new_store())
        .invoke_handler(tauri::generate_handler![
            list_plugins,
            import_plugin,
            uninstall_plugin,
            list_configs,
            save_config,
            delete_config,
            run_plugin,
            pty_input,
            kill_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

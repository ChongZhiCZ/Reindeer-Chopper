# Script Executor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Tauri v2 + React desktop app that loads plugin descriptors from a local directory, renders parameter forms, and executes Node.js scripts in a real PTY with multi-tab live terminal output.

**Architecture:** Rust backend uses `portable-pty` to manage PTY sessions keyed by `taskId` in a `HashMap`. React frontend renders dynamic forms from `plugin.json` descriptors, manages saved configurations, and displays xterm.js terminals per task tab.

**Tech Stack:** Tauri v2, React 18 + TypeScript, xterm.js, Rust `portable-pty`, Tailwind CSS v4, Vite, Vitest

---

## Task 1: Scaffold Tauri v2 + React + TypeScript Project

**Files:**
- Create: project root (in-place scaffold)

**Step 1: Scaffold Tauri v2 app in current directory**

```bash
cd /Users/zhichong/Documents/GitHub/Reindeer-Chopper
npm create tauri-app@latest . -- --template react-ts --manager npm --yes
```

If prompted about existing directory, confirm overwrite. The scaffold creates:
- `src/` — React frontend
- `src-tauri/` — Rust backend
- `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`

**Step 2: Install frontend dependencies**

```bash
npm install
npm install @xterm/xterm @xterm/addon-fit uuid
npm install -D @types/uuid vitest @testing-library/react @testing-library/user-event jsdom
```

**Step 3: Install Tailwind CSS v4**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

Add to `vite.config.ts`:
```ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ...
})
```

Add to `src/index.css` (top of file, replacing all existing content):
```css
@import "tailwindcss";
```

**Step 4: Add Rust dependencies**

Edit `src-tauri/Cargo.toml`, add to `[dependencies]`:
```toml
portable-pty = "0.8"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
tokio = { version = "1", features = ["full"] }
```

**Step 5: Verify dev server starts**

```bash
npm run tauri dev
```

Expected: Tauri window opens with default React page. `Ctrl+C` to stop.

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Tauri v2 + React + TypeScript project"
```

---

## Task 2: Define Shared TypeScript Types

**Files:**
- Create: `src/types.ts`

**Step 1: Write types**

```ts
// src/types.ts

export type ParameterType = 'text' | 'number' | 'boolean' | 'select' | 'filepath'

export interface ParameterDescriptor {
  name: string
  label: string
  type: ParameterType
  required?: boolean
  description?: string
  default?: string | number | boolean
  options?: string[]  // for type: 'select'
}

export interface PluginDescriptor {
  id: string
  name: string
  version: string
  description?: string
  entry: string
  parameters: ParameterDescriptor[]
}

export interface PluginConfig {
  id: string
  name: string
  params: Record<string, string | number | boolean>
}

export type TaskStatus = 'running' | 'done' | 'error'

export interface Task {
  id: string        // taskId from Rust
  pluginId: string
  pluginName: string
  configName: string
  status: TaskStatus
  exitCode?: number
}
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Rust — Plugin Scanner

**Files:**
- Create: `src-tauri/src/plugin_scanner.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Write plugin scanner module**

```rust
// src-tauri/src/plugin_scanner.rs
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
    // injected by scanner, not in JSON
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
        make_temp_plugin(&dir, "my-plugin", r#"{
            "id": "my-plugin",
            "name": "My Plugin",
            "version": "1.0.0",
            "entry": "index.js",
            "parameters": [
                {"name": "foo", "label": "Foo", "type": "text"}
            ]
        }"#);
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
```

**Step 2: Add tempfile to dev-dependencies**

In `src-tauri/Cargo.toml`, add:
```toml
[dev-dependencies]
tempfile = "3"
```

**Step 3: Add module to lib.rs**

In `src-tauri/src/lib.rs`, add near the top:
```rust
mod plugin_scanner;
```

**Step 4: Run tests**

```bash
cd src-tauri && cargo test plugin_scanner
```

Expected: 4 tests pass.

**Step 5: Commit**

```bash
cd ..
git add src-tauri/src/plugin_scanner.rs src-tauri/src/lib.rs src-tauri/Cargo.toml
git commit -m "feat: add Rust plugin scanner with tests"
```

---

## Task 4: Rust — Config Manager

**Files:**
- Create: `src-tauri/src/config_manager.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Write config manager**

```rust
// src-tauri/src/config_manager.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginConfig {
    pub id: String,
    pub name: String,
    pub params: HashMap<String, serde_json::Value>,
}

fn config_file(configs_dir: &PathBuf, plugin_id: &str) -> PathBuf {
    configs_dir.join(format!("{}.json", plugin_id))
}

pub fn load_configs(configs_dir: &PathBuf, plugin_id: &str) -> Vec<PluginConfig> {
    let path = config_file(configs_dir, plugin_id);
    let Ok(content) = std::fs::read_to_string(&path) else {
        return Vec::new();
    };
    serde_json::from_str(&content).unwrap_or_default()
}

pub fn save_config(
    configs_dir: &PathBuf,
    plugin_id: &str,
    config: PluginConfig,
) -> Result<(), String> {
    std::fs::create_dir_all(configs_dir).map_err(|e| e.to_string())?;
    let mut configs = load_configs(configs_dir, plugin_id);
    if let Some(existing) = configs.iter_mut().find(|c| c.id == config.id) {
        *existing = config;
    } else {
        configs.push(config);
    }
    let json = serde_json::to_string_pretty(&configs).map_err(|e| e.to_string())?;
    std::fs::write(config_file(configs_dir, plugin_id), json).map_err(|e| e.to_string())
}

pub fn delete_config(configs_dir: &PathBuf, plugin_id: &str, config_id: &str) -> Result<(), String> {
    let mut configs = load_configs(configs_dir, plugin_id);
    configs.retain(|c| c.id != config_id);
    let json = serde_json::to_string_pretty(&configs).map_err(|e| e.to_string())?;
    std::fs::write(config_file(configs_dir, plugin_id), json).map_err(|e| e.to_string())
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
}
```

**Step 2: Add module to lib.rs**

```rust
mod config_manager;
```

**Step 3: Run tests**

```bash
cd src-tauri && cargo test config_manager
```

Expected: 4 tests pass.

**Step 4: Commit**

```bash
cd ..
git add src-tauri/src/config_manager.rs src-tauri/src/lib.rs
git commit -m "feat: add Rust config manager with tests"
```

---

## Task 5: Rust — PTY Manager & Tauri Commands

**Files:**
- Create: `src-tauri/src/pty_manager.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Write PTY manager**

```rust
// src-tauri/src/pty_manager.rs
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

pub struct PtySession {
    writer: Box<dyn Write + Send>,
    master: Box<dyn portable_pty::MasterPty + Send>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
}

pub type PtyStore = Arc<Mutex<HashMap<String, PtySession>>>;

pub fn new_store() -> PtyStore {
    Arc::new(Mutex::new(HashMap::new()))
}

/// Spawn a command in a PTY. Streams output via "pty_output" events.
/// Returns the task_id.
pub fn spawn(
    store: PtyStore,
    app: AppHandle,
    cwd: String,
    argv: Vec<String>,
    task_id: Option<String>,
) -> Result<String, String> {
    let task_id = task_id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let pty_system = NativePtySystem::default();
    let pair = pty_system
        .openpty(PtySize { rows: 24, cols: 80, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new(&argv[0]);
    cmd.args(&argv[1..]);
    cmd.cwd(&cwd);
    // Forward parent environment so node/npm are found
    for (k, v) in std::env::vars() {
        cmd.env(k, v);
    }

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;

    let tid = task_id.clone();
    let app_clone = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_clone.emit("pty_output", serde_json::json!({
                        "taskId": tid,
                        "data": data
                    }));
                }
            }
        }
        let _ = app_clone.emit("task_done", serde_json::json!({ "taskId": tid }));
    });

    store.lock().unwrap().insert(
        task_id.clone(),
        PtySession { writer, master: pair.master, child },
    );

    Ok(task_id)
}

pub fn write_input(store: &PtyStore, task_id: &str, data: &str) -> Result<(), String> {
    let mut map = store.lock().unwrap();
    let session = map.get_mut(task_id).ok_or("task not found")?;
    session.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())
}

pub fn kill_task(store: &PtyStore, task_id: &str) -> Result<(), String> {
    let mut map = store.lock().unwrap();
    if let Some(mut session) = map.remove(task_id) {
        let _ = session.child.kill();
    }
    Ok(())
}
```

**Step 2: Wire Tauri commands in lib.rs**

Replace the contents of `src-tauri/src/lib.rs` with:

```rust
mod config_manager;
mod plugin_scanner;
mod pty_manager;

use config_manager::PluginConfig;
use pty_manager::PtyStore;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

fn app_data_dir(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().expect("app data dir")
}

// ── Plugin commands ──────────────────────────────────────────────────────────

#[tauri::command]
fn list_plugins(app: AppHandle) -> Vec<plugin_scanner::PluginDescriptor> {
    let dir = app_data_dir(&app).join("plugins");
    plugin_scanner::scan_plugins(&dir)
}

// ── Config commands ──────────────────────────────────────────────────────────

#[tauri::command]
fn list_configs(app: AppHandle, plugin_id: String) -> Vec<PluginConfig> {
    let dir = app_data_dir(&app).join("configs");
    config_manager::load_configs(&dir, &plugin_id)
}

#[tauri::command]
fn save_config(
    app: AppHandle,
    plugin_id: String,
    config: PluginConfig,
) -> Result<(), String> {
    let dir = app_data_dir(&app).join("configs");
    config_manager::save_config(&dir, &plugin_id, config)
}

#[tauri::command]
fn delete_config(
    app: AppHandle,
    plugin_id: String,
    config_id: String,
) -> Result<(), String> {
    let dir = app_data_dir(&app).join("configs");
    config_manager::delete_config(&dir, &plugin_id, &config_id)
}

// ── PTY commands ─────────────────────────────────────────────────────────────

#[tauri::command]
async fn run_plugin(
    app: AppHandle,
    store: State<'_, PtyStore>,
    plugin_id: String,
    plugin_name: String,
    config_name: String,
    params: std::collections::HashMap<String, serde_json::Value>,
) -> Result<String, String> {
    let plugin_dir = app_data_dir(&app)
        .join("plugins")
        .join(&plugin_id);

    // Load plugin.json to get entry and parameter names
    let json_path = plugin_dir.join("plugin.json");
    let content = std::fs::read_to_string(&json_path)
        .map_err(|e| format!("Cannot read plugin.json: {}", e))?;
    let descriptor: plugin_scanner::PluginDescriptor =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let node_modules = plugin_dir.join("node_modules");
    let pkg_json = plugin_dir.join("package.json");

    // If package.json exists but node_modules doesn't, run npm install first
    if pkg_json.exists() && !node_modules.exists() {
        let install_task = pty_manager::spawn(
            store.inner().clone(),
            app.clone(),
            plugin_dir.to_string_lossy().to_string(),
            vec!["npm".to_string(), "install".to_string()],
            Some(format!("npm-install-{}", plugin_id)),
        )?;
        // Wait for npm install to complete
        // Simple approach: spawn blocks on thread, we wait briefly
        // Full solution: chain via a "then" mechanism - for MVP, emit a special event
        // and the frontend shows the install tab first
        return Ok(install_task);
    }

    // Build argv: node <entry> --param1 val1 ...
    let mut argv = vec!["node".to_string(), descriptor.entry.clone()];
    for param in &descriptor.parameters {
        if let Some(val) = params.get(&param.name) {
            match val {
                serde_json::Value::Bool(true) => argv.push(format!("--{}", param.name)),
                serde_json::Value::Bool(false) => {}
                serde_json::Value::Null => {}
                other => {
                    argv.push(format!("--{}", param.name));
                    argv.push(other.as_str().map(|s| s.to_string())
                        .unwrap_or_else(|| other.to_string()));
                }
            }
        }
    }

    let task_id = pty_manager::spawn(
        store.inner().clone(),
        app,
        plugin_dir.to_string_lossy().to_string(),
        argv,
        None,
    )?;
    Ok(task_id)
}

#[tauri::command]
fn pty_input(
    store: State<'_, PtyStore>,
    task_id: String,
    data: String,
) -> Result<(), String> {
    pty_manager::write_input(store.inner(), &task_id, &data)
}

#[tauri::command]
fn kill_task(
    store: State<'_, PtyStore>,
    task_id: String,
) -> Result<(), String> {
    pty_manager::kill_task(store.inner(), &task_id)
}

// ── App setup ────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(pty_manager::new_store())
        .invoke_handler(tauri::generate_handler![
            list_plugins,
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
```

**Step 3: Add tauri-plugin-dialog to Cargo.toml**

```toml
tauri-plugin-dialog = "2"
```

And add to `src-tauri/tauri.conf.json` under `plugins`:
```json
"dialog": {}
```

**Step 4: Build to verify Rust compiles**

```bash
cd src-tauri && cargo build 2>&1 | tail -20
```

Expected: `Compiling reindeer-chopper ...` then `Finished`. Fix any compile errors before continuing.

**Step 5: Commit**

```bash
cd ..
git add src-tauri/src/pty_manager.rs src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "feat: add PTY manager and Tauri commands"
```

---

## Task 6: React — Tauri IPC Hooks

**Files:**
- Create: `src/hooks/usePlugins.ts`
- Create: `src/hooks/useConfigs.ts`

**Step 1: Write plugin hook**

```ts
// src/hooks/usePlugins.ts
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import { PluginDescriptor } from '../types'

export function usePlugins() {
  const [plugins, setPlugins] = useState<PluginDescriptor[]>([])

  const refresh = () => {
    invoke<PluginDescriptor[]>('list_plugins').then(setPlugins).catch(console.error)
  }

  useEffect(() => { refresh() }, [])
  return { plugins, refresh }
}
```

**Step 2: Write config hook**

```ts
// src/hooks/useConfigs.ts
import { invoke } from '@tauri-apps/api/core'
import { useCallback, useEffect, useState } from 'react'
import { PluginConfig } from '../types'
import { v4 as uuidv4 } from 'uuid'

export function useConfigs(pluginId: string | null) {
  const [configs, setConfigs] = useState<PluginConfig[]>([])

  const refresh = useCallback(() => {
    if (!pluginId) return
    invoke<PluginConfig[]>('list_configs', { pluginId }).then(setConfigs).catch(console.error)
  }, [pluginId])

  useEffect(() => { refresh() }, [refresh])

  const saveConfig = async (name: string, params: Record<string, string | number | boolean>, existingId?: string) => {
    if (!pluginId) return
    const config: PluginConfig = { id: existingId ?? uuidv4(), name, params }
    await invoke('save_config', { pluginId, config })
    refresh()
    return config
  }

  const deleteConfig = async (configId: string) => {
    if (!pluginId) return
    await invoke('delete_config', { pluginId, configId })
    refresh()
  }

  return { configs, saveConfig, deleteConfig, refresh }
}
```

**Step 3: Commit**

```bash
git add src/hooks/
git commit -m "feat: add React hooks for plugin and config IPC"
```

---

## Task 7: React — Form Field Components

**Files:**
- Create: `src/components/fields/TextField.tsx`
- Create: `src/components/fields/NumberField.tsx`
- Create: `src/components/fields/BooleanField.tsx`
- Create: `src/components/fields/SelectField.tsx`
- Create: `src/components/fields/FilePathField.tsx`
- Create: `src/components/fields/FieldWrapper.tsx`

**Step 1: Write FieldWrapper (label + description)**

```tsx
// src/components/fields/FieldWrapper.tsx
interface Props {
  label: string
  description?: string
  required?: boolean
  children: React.ReactNode
}

export function FieldWrapper({ label, description, required, children }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
  )
}
```

**Step 2: Write TextField**

```tsx
// src/components/fields/TextField.tsx
import { FieldWrapper } from './FieldWrapper'

interface Props {
  name: string; label: string; value: string
  required?: boolean; description?: string
  onChange: (v: string) => void
}

export function TextField({ name, label, value, required, description, onChange }: Props) {
  return (
    <FieldWrapper label={label} required={required} description={description}>
      <input
        id={name} type="text" value={value} onChange={e => onChange(e.target.value)}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </FieldWrapper>
  )
}
```

**Step 3: Write NumberField**

```tsx
// src/components/fields/NumberField.tsx
import { FieldWrapper } from './FieldWrapper'

interface Props {
  name: string; label: string; value: number
  required?: boolean; description?: string
  onChange: (v: number) => void
}

export function NumberField({ name, label, value, required, description, onChange }: Props) {
  return (
    <FieldWrapper label={label} required={required} description={description}>
      <input
        id={name} type="number" value={value} onChange={e => onChange(Number(e.target.value))}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
      />
    </FieldWrapper>
  )
}
```

**Step 4: Write BooleanField**

```tsx
// src/components/fields/BooleanField.tsx
import { FieldWrapper } from './FieldWrapper'

interface Props {
  name: string; label: string; value: boolean
  description?: string
  onChange: (v: boolean) => void
}

export function BooleanField({ name, label, value, description, onChange }: Props) {
  return (
    <FieldWrapper label={label} description={description}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          id={name} type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm text-gray-600">启用</span>
      </label>
    </FieldWrapper>
  )
}
```

**Step 5: Write SelectField**

```tsx
// src/components/fields/SelectField.tsx
import { FieldWrapper } from './FieldWrapper'

interface Props {
  name: string; label: string; value: string; options: string[]
  required?: boolean; description?: string
  onChange: (v: string) => void
}

export function SelectField({ name, label, value, options, required, description, onChange }: Props) {
  return (
    <FieldWrapper label={label} required={required} description={description}>
      <select
        id={name} value={value} onChange={e => onChange(e.target.value)}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </FieldWrapper>
  )
}
```

**Step 6: Write FilePathField**

```tsx
// src/components/fields/FilePathField.tsx
import { open } from '@tauri-apps/plugin-dialog'
import { FieldWrapper } from './FieldWrapper'

interface Props {
  name: string; label: string; value: string
  required?: boolean; description?: string
  onChange: (v: string) => void
}

export function FilePathField({ name, label, value, required, description, onChange }: Props) {
  const handleBrowse = async () => {
    const selected = await open({ directory: false, multiple: false })
    if (typeof selected === 'string') onChange(selected)
  }
  return (
    <FieldWrapper label={label} required={required} description={description}>
      <div className="flex gap-2">
        <input
          id={name} type="text" value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={handleBrowse}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
          浏览
        </button>
      </div>
    </FieldWrapper>
  )
}
```

**Step 7: Commit**

```bash
git add src/components/fields/
git commit -m "feat: add form field components"
```

---

## Task 8: React — PluginForm + ConfigBar

**Files:**
- Create: `src/components/PluginForm.tsx`
- Create: `src/components/ConfigBar.tsx`

**Step 1: Write PluginForm**

```tsx
// src/components/PluginForm.tsx
import { ParameterDescriptor, PluginDescriptor } from '../types'
import { BooleanField } from './fields/BooleanField'
import { FilePathField } from './fields/FilePathField'
import { NumberField } from './fields/NumberField'
import { SelectField } from './fields/SelectField'
import { TextField } from './fields/TextField'

interface Props {
  plugin: PluginDescriptor
  values: Record<string, string | number | boolean>
  onChange: (name: string, value: string | number | boolean) => void
  onRun: () => void
  canRun: boolean
}

function defaultValue(p: ParameterDescriptor): string | number | boolean {
  if (p.default !== undefined) return p.default as string | number | boolean
  if (p.type === 'boolean') return false
  if (p.type === 'number') return 0
  if (p.type === 'select') return p.options?.[0] ?? ''
  return ''
}

export function initFormValues(plugin: PluginDescriptor): Record<string, string | number | boolean> {
  return Object.fromEntries(plugin.parameters.map(p => [p.name, defaultValue(p)]))
}

export function PluginForm({ plugin, values, onChange, onRun, canRun }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {plugin.description && (
        <p className="text-sm text-gray-500">{plugin.description}</p>
      )}
      {plugin.parameters.map(p => {
        const val = values[p.name] ?? defaultValue(p)
        const common = { key: p.name, name: p.name, label: p.label, required: p.required, description: p.description }
        if (p.type === 'text') return <TextField {...common} value={val as string} onChange={v => onChange(p.name, v)} />
        if (p.type === 'number') return <NumberField {...common} value={val as number} onChange={v => onChange(p.name, v)} />
        if (p.type === 'boolean') return <BooleanField {...common} value={val as boolean} onChange={v => onChange(p.name, v)} />
        if (p.type === 'select') return <SelectField {...common} value={val as string} options={p.options ?? []} onChange={v => onChange(p.name, v)} />
        if (p.type === 'filepath') return <FilePathField {...common} value={val as string} onChange={v => onChange(p.name, v)} />
        return null
      })}
      <div className="flex justify-end pt-2">
        <button
          onClick={onRun} disabled={!canRun}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          运行此配置
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Write ConfigBar**

```tsx
// src/components/ConfigBar.tsx
import { useState } from 'react'
import { PluginConfig } from '../types'

interface Props {
  configs: PluginConfig[]
  selectedId: string | null
  onSelect: (config: PluginConfig | null) => void
  onSave: (name: string) => void
  onDelete: (id: string) => void
}

export function ConfigBar({ configs, selectedId, onSelect, onSave, onDelete }: Props) {
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const selected = configs.find(c => c.id === selectedId) ?? null

  return (
    <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
      <span className="text-sm text-gray-600 shrink-0">配置：</span>
      <select
        value={selectedId ?? ''}
        onChange={e => onSelect(configs.find(c => c.id === e.target.value) ?? null)}
        className="border border-gray-300 rounded px-2 py-1 text-sm min-w-0 flex-1 max-w-48"
      >
        <option value="">-- 未选择 --</option>
        {configs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {isCreating ? (
        <>
          <input
            autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onSave(newName.trim()); setNewName(''); setIsCreating(false) } if (e.key === 'Escape') setIsCreating(false) }}
            placeholder="配置名称"
            className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
          />
          <button onClick={() => { if (newName.trim()) { onSave(newName.trim()); setNewName(''); setIsCreating(false) } }}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">确认</button>
          <button onClick={() => setIsCreating(false)}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">取消</button>
        </>
      ) : (
        <>
          <button onClick={() => setIsCreating(true)}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">新建</button>
          <button onClick={() => selected && onSave(selected.name)} disabled={!selected}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">保存</button>
          <button onClick={() => selected && onDelete(selected.id)} disabled={!selected}
            className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50">删除</button>
        </>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/PluginForm.tsx src/components/ConfigBar.tsx
git commit -m "feat: add PluginForm and ConfigBar components"
```

---

## Task 9: React — TaskTabBar

**Files:**
- Create: `src/components/TaskTabBar.tsx`

**Step 1: Write TaskTabBar**

```tsx
// src/components/TaskTabBar.tsx
import { Task } from '../types'

interface Props {
  tasks: Task[]
  activeTaskId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

function statusColor(status: Task['status']) {
  if (status === 'running') return 'bg-green-400'
  if (status === 'error') return 'bg-red-400'
  return 'bg-gray-400'
}

export function TaskTabBar({ tasks, activeTaskId, onSelect, onClose }: Props) {
  if (tasks.length === 0) return null

  return (
    <div className="flex items-end gap-0.5 border-b border-gray-200 overflow-x-auto">
      {tasks.map(task => {
        const isActive = task.id === activeTaskId
        const title = `${task.pluginName}-${task.configName}`
        return (
          <div
            key={task.id}
            onClick={() => onSelect(task.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-t border-x rounded-t text-sm select-none
              ${isActive
                ? 'bg-white border-gray-200 text-gray-900 shrink-0'
                : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100 min-w-0'
              }
            `}
            style={isActive ? {} : { minWidth: '80px', maxWidth: '160px' }}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor(task.status)}`} />
            <span className={isActive ? '' : 'truncate flex-1'} title={title}>
              {title}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onClose(task.id) }}
              className="shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/TaskTabBar.tsx
git commit -m "feat: add TaskTabBar component"
```

---

## Task 10: React — TerminalPanel with xterm.js

**Files:**
- Create: `src/components/TerminalPanel.tsx`
- Create: `src/hooks/useTerminal.ts`

**Step 1: Write terminal hook (manages per-task Terminal instances)**

```ts
// src/hooks/useTerminal.ts
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

interface TerminalEntry {
  terminal: Terminal
  fitAddon: FitAddon
}

// Global map of taskId → xterm Terminal (lives outside React lifecycle)
const terminalMap = new Map<string, TerminalEntry>()

export function getOrCreateTerminal(taskId: string): TerminalEntry {
  if (!terminalMap.has(taskId)) {
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminalMap.set(taskId, { terminal, fitAddon })
  }
  return terminalMap.get(taskId)!
}

export function destroyTerminal(taskId: string) {
  const entry = terminalMap.get(taskId)
  if (entry) {
    entry.terminal.dispose()
    terminalMap.delete(taskId)
  }
}

/** Mounts the terminal for taskId into the given DOM element */
export function useTerminalMount(taskId: string | null, containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!taskId || !containerRef.current) return
    const { terminal, fitAddon } = getOrCreateTerminal(taskId)
    // Detach any previous open (safe to call even if not opened)
    terminal.open(containerRef.current)
    fitAddon.fit()

    const ro = new ResizeObserver(() => fitAddon.fit())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [taskId])
}

/** Sets up global PTY event listeners (call once at app level) */
export function usePtyEvents() {
  useEffect(() => {
    const unlisten1 = listen<{ taskId: string; data: string }>('pty_output', event => {
      const { taskId, data } = event.payload
      const entry = terminalMap.get(taskId)
      entry?.terminal.write(data)
    })
    return () => { unlisten1.then(fn => fn()) }
  }, [])
}
```

**Step 2: Write TerminalPanel component**

```tsx
// src/components/TerminalPanel.tsx
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useRef } from 'react'
import { getOrCreateTerminal, useTerminalMount } from '../hooks/useTerminal'

interface Props {
  activeTaskId: string | null
}

export function TerminalPanel({ activeTaskId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  useTerminalMount(activeTaskId, containerRef)

  useEffect(() => {
    if (!activeTaskId) return
    const { terminal } = getOrCreateTerminal(activeTaskId)
    const dispose = terminal.onData(data => {
      invoke('pty_input', { taskId: activeTaskId, data }).catch(console.error)
    })
    return () => dispose.dispose()
  }, [activeTaskId])

  return (
    <div className="flex-1 bg-[#1e1e1e] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/hooks/useTerminal.ts src/components/TerminalPanel.tsx
git commit -m "feat: add xterm.js terminal panel with per-task instances"
```

---

## Task 11: React — PluginSidebar

**Files:**
- Create: `src/components/PluginSidebar.tsx`

**Step 1: Write PluginSidebar**

```tsx
// src/components/PluginSidebar.tsx
import { PluginDescriptor } from '../types'

interface Props {
  plugins: PluginDescriptor[]
  selectedId: string | null
  onSelect: (plugin: PluginDescriptor) => void
  onRefresh: () => void
}

export function PluginSidebar({ plugins, selectedId, onSelect, onRefresh }: Props) {
  return (
    <div className="w-48 shrink-0 border-r border-gray-200 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">插件</span>
        <button onClick={onRefresh} title="刷新插件列表"
          className="text-gray-400 hover:text-gray-700 text-sm">↻</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {plugins.length === 0 ? (
          <p className="text-xs text-gray-400 p-3">未找到插件</p>
        ) : (
          plugins.map(p => (
            <button key={p.id} onClick={() => onSelect(p)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 truncate
                ${p.id === selectedId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
              title={p.name}
            >
              {p.name}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/PluginSidebar.tsx
git commit -m "feat: add PluginSidebar component"
```

---

## Task 12: React — Wire App.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

**Step 1: Write App.tsx**

Replace `src/App.tsx` entirely:

```tsx
// src/App.tsx
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useReducer, useRef } from 'react'
import { ConfigBar } from './components/ConfigBar'
import { PluginForm, initFormValues } from './components/PluginForm'
import { PluginSidebar } from './components/PluginSidebar'
import { TaskTabBar } from './components/TaskTabBar'
import { TerminalPanel } from './components/TerminalPanel'
import { useConfigs } from './hooks/useConfigs'
import { usePlugins } from './hooks/usePlugins'
import { destroyTerminal } from './hooks/useTerminal'
import { PluginDescriptor, Task } from './types'

interface AppState {
  selectedPlugin: PluginDescriptor | null
  selectedConfigId: string | null
  formValues: Record<string, string | number | boolean>
  tasks: Task[]
  activeTaskId: string | null
}

type Action =
  | { type: 'SELECT_PLUGIN'; plugin: PluginDescriptor }
  | { type: 'SELECT_CONFIG'; configId: string | null; values: Record<string, string | number | boolean> }
  | { type: 'SET_FORM_VALUE'; name: string; value: string | number | boolean }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'SET_ACTIVE_TASK'; id: string }
  | { type: 'CLOSE_TASK'; id: string }
  | { type: 'TASK_DONE'; id: string; exitCode?: number }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SELECT_PLUGIN':
      return { ...state, selectedPlugin: action.plugin, selectedConfigId: null, formValues: initFormValues(action.plugin) }
    case 'SELECT_CONFIG':
      return { ...state, selectedConfigId: action.configId, formValues: action.values }
    case 'SET_FORM_VALUE':
      return { ...state, formValues: { ...state.formValues, [action.name]: action.value } }
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.task], activeTaskId: action.task.id }
    case 'SET_ACTIVE_TASK':
      return { ...state, activeTaskId: action.id }
    case 'CLOSE_TASK': {
      const tasks = state.tasks.filter(t => t.id !== action.id)
      const activeTaskId = state.activeTaskId === action.id
        ? (tasks[tasks.length - 1]?.id ?? null)
        : state.activeTaskId
      return { ...state, tasks, activeTaskId }
    }
    case 'TASK_DONE':
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.id
          ? { ...t, status: action.exitCode === 0 ? 'done' : 'error', exitCode: action.exitCode }
          : t)
      }
    default:
      return state
  }
}

export default function App() {
  const { plugins, refresh } = usePlugins()
  const [state, dispatch] = useReducer(reducer, {
    selectedPlugin: null, selectedConfigId: null,
    formValues: {}, tasks: [], activeTaskId: null
  })
  const { configs, saveConfig, deleteConfig } = useConfigs(state.selectedPlugin?.id ?? null)

  // Listen for PTY events
  useEffect(() => {
    const unsub1 = listen<{ taskId: string }>('task_done', e => {
      dispatch({ type: 'TASK_DONE', id: e.payload.taskId })
    })
    return () => { unsub1.then(fn => fn()) }
  }, [])

  const handleSelectConfig = (config: typeof configs[0] | null) => {
    if (!state.selectedPlugin) return
    dispatch({
      type: 'SELECT_CONFIG',
      configId: config?.id ?? null,
      values: config ? config.params as Record<string, string | number | boolean> : initFormValues(state.selectedPlugin)
    })
  }

  const handleSaveConfig = async (name: string) => {
    if (!state.selectedPlugin) return
    await saveConfig(name, state.formValues, state.selectedConfigId ?? undefined)
  }

  const handleRun = async () => {
    if (!state.selectedPlugin) return
    const configName = configs.find(c => c.id === state.selectedConfigId)?.name ?? '默认'
    try {
      const taskId = await invoke<string>('run_plugin', {
        pluginId: state.selectedPlugin.id,
        pluginName: state.selectedPlugin.name,
        configName,
        params: state.formValues,
      })
      dispatch({
        type: 'ADD_TASK',
        task: { id: taskId, pluginId: state.selectedPlugin.id, pluginName: state.selectedPlugin.name, configName, status: 'running' }
      })
    } catch (e) {
      console.error('run_plugin failed', e)
    }
  }

  const handleCloseTask = async (id: string) => {
    await invoke('kill_task', { taskId: id }).catch(console.error)
    destroyTerminal(id)
    dispatch({ type: 'CLOSE_TASK', id })
  }

  const canRun = !!state.selectedPlugin &&
    state.selectedPlugin.parameters.filter(p => p.required).every(p => {
      const v = state.formValues[p.name]
      return v !== '' && v !== undefined && v !== null
    })

  return (
    <div className="flex h-screen overflow-hidden bg-white text-gray-900">
      <PluginSidebar
        plugins={plugins}
        selectedId={state.selectedPlugin?.id ?? null}
        onSelect={p => dispatch({ type: 'SELECT_PLUGIN', plugin: p })}
        onRefresh={refresh}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Config + Form area */}
        <div className="p-4 border-b border-gray-200 overflow-y-auto max-h-96">
          {state.selectedPlugin ? (
            <>
              <h2 className="text-base font-semibold mb-3">{state.selectedPlugin.name}</h2>
              <ConfigBar
                configs={configs}
                selectedId={state.selectedConfigId}
                onSelect={handleSelectConfig}
                onSave={handleSaveConfig}
                onDelete={deleteConfig}
              />
              <div className="mt-3">
                <PluginForm
                  plugin={state.selectedPlugin}
                  values={state.formValues}
                  onChange={(name, value) => dispatch({ type: 'SET_FORM_VALUE', name, value })}
                  onRun={handleRun}
                  canRun={canRun}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">从左侧选择一个插件</p>
          )}
        </div>

        {/* Terminal area */}
        <div className="flex flex-col flex-1 min-h-0">
          <TaskTabBar
            tasks={state.tasks}
            activeTaskId={state.activeTaskId}
            onSelect={id => dispatch({ type: 'SET_ACTIVE_TASK', id })}
            onClose={handleCloseTask}
          />
          <TerminalPanel activeTaskId={state.activeTaskId} />
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Ensure main.tsx imports CSS**

`src/main.tsx` should have:
```tsx
import './index.css'
```

**Step 3: Run and verify the app works end-to-end**

```bash
npm run tauri dev
```

Expected: App window opens, sidebar shows "未找到插件", clicking around doesn't crash.

**Step 4: Commit**

```bash
git add src/App.tsx src/main.tsx src/index.css
git commit -m "feat: wire up App.tsx with full state management"
```

---

## Task 13: Create a Sample Plugin for Testing

**Files:**
- Create: `sample-plugins/hello-world/plugin.json`
- Create: `sample-plugins/hello-world/package.json`
- Create: `sample-plugins/hello-world/index.js`

**Step 1: Create sample plugin files**

```json
// sample-plugins/hello-world/plugin.json
{
  "id": "hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "description": "A sample plugin that greets the user",
  "entry": "index.js",
  "parameters": [
    {
      "name": "name",
      "label": "Your Name",
      "type": "text",
      "required": true,
      "default": "World",
      "description": "Who to greet"
    },
    {
      "name": "count",
      "label": "Repeat Count",
      "type": "number",
      "default": 3
    },
    {
      "name": "loud",
      "label": "LOUD MODE",
      "type": "boolean",
      "default": false
    }
  ]
}
```

```json
// sample-plugins/hello-world/package.json
{
  "name": "hello-world",
  "version": "1.0.0",
  "description": "Sample plugin"
}
```

```js
// sample-plugins/hello-world/index.js
const args = process.argv.slice(2)
const get = (flag) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : undefined
}
const has = (flag) => args.includes(flag)

const name = get('--name') || 'World'
const count = parseInt(get('--count') || '3', 10)
const loud = has('--loud')

for (let i = 0; i < count; i++) {
  const msg = `Hello, ${name}! (${i + 1}/${count})`
  console.log(loud ? msg.toUpperCase() : msg)
}
```

**Step 2: Copy to app data dir and test**

```bash
mkdir -p ~/Library/Application\ Support/reindeer-chopper/plugins/hello-world
cp sample-plugins/hello-world/* ~/Library/Application\ Support/reindeer-chopper/plugins/hello-world/
```

Run `npm run tauri dev`, select Hello World plugin, fill in parameters, click 运行此配置. Expected: terminal shows greeting output.

**Step 3: Commit**

```bash
git add sample-plugins/
git commit -m "feat: add hello-world sample plugin for testing"
```

---

## Task 14: Handle npm install flow properly

The current `run_plugin` command returns the `npm-install-{id}` task when `node_modules` is missing, but doesn't chain to running the actual script after install completes.

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/App.tsx`

**Step 1: Emit a special event after npm install completes**

In `pty_manager.rs`, the reader thread already emits `task_done`. In `lib.rs`, modify the `run_plugin` command to store pending run info and listen for `task_done` of the install task:

Replace the npm install block in `run_plugin` with:

```rust
if pkg_json.exists() && !node_modules.exists() {
    // Spawn npm install; after it finishes, the frontend will re-invoke run_plugin
    // (node_modules will exist by then)
    let task_id = pty_manager::spawn(
        store.inner().clone(),
        app.clone(),
        plugin_dir.to_string_lossy().to_string(),
        vec!["npm".to_string(), "install".to_string()],
        Some(format!("install-{}", uuid::Uuid::new_v4())),
    )?;
    // Emit a special event so frontend knows this was an install task
    app.emit("npm_install_started", serde_json::json!({
        "taskId": task_id,
        "pluginId": plugin_id,
        "pluginName": plugin_name,
        "configName": config_name,
        "params": params,
    })).ok();
    return Ok(task_id);
}
```

**Step 2: Handle npm_install_started in App.tsx**

In the `useEffect` that listens for events, add:

```ts
const unsub2 = listen<{
  taskId: string; pluginId: string; pluginName: string; configName: string; params: Record<string, unknown>
}>('npm_install_started', async e => {
  const { taskId, pluginId, pluginName, configName, params } = e.payload
  dispatch({
    type: 'ADD_TASK',
    task: { id: taskId, pluginId, pluginName: `${pluginName} [npm install]`, configName, status: 'running' }
  })
})

const unsub3 = listen<{ taskId: string }>('task_done', async e => {
  // If this was an npm install task, re-run the plugin
  if (e.payload.taskId.startsWith('install-')) {
    // The user can simply click Run again now that node_modules exists
    // For auto-re-run, store pending params in state (beyond MVP scope)
  }
})
```

For MVP, after install completes the user clicks Run again and node_modules now exists so it runs directly.

**Step 3: Commit**

```bash
git add src-tauri/src/lib.rs src/App.tsx
git commit -m "feat: handle npm install flow with install task tab"
```

---

## Task 15: Final Polish & Verify

**Step 1: Test complete flow**

1. Copy `sample-plugins/hello-world` to app data plugins dir
2. Run `npm run tauri dev`
3. Verify: plugin appears in sidebar
4. Select plugin, create a config named "测试", fill name="Claude", count=5
5. Click 运行此配置
6. Verify: new tab "Hello World-测试" appears, terminal shows 5 greeting lines
7. Run same plugin with different params: verify second tab opens, both run simultaneously
8. Click × on a tab: verify tab closes and process is killed
9. Switch between tabs: verify correct terminal output shown for each

**Step 2: Build release**

```bash
npm run tauri build
```

Expected: builds without errors, `.dmg` produced in `src-tauri/target/release/bundle/`.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final build verification"
```

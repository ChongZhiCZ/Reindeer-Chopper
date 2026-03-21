use chrono::{SecondsFormat, Utc};
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

pub struct PtySession {
    writer: Box<dyn Write + Send>,
    _master: Box<dyn portable_pty::MasterPty + Send>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
    plugin_id: Option<String>,
}

pub type PtyStore = Arc<Mutex<HashMap<String, PtySession>>>;

fn now_ts() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

pub fn emit_task_log(
    app: &AppHandle,
    task_id: Option<&str>,
    level: &str,
    source: &str,
    phase: &str,
    message: impl Into<String>,
) {
    let _ = app.emit(
        "task_log",
        serde_json::json!({
            "taskId": task_id,
            "level": level,
            "source": source,
            "phase": phase,
            "message": message.into(),
            "ts": now_ts(),
        }),
    );
}

pub fn new_store() -> PtyStore {
    Arc::new(Mutex::new(HashMap::new()))
}

pub fn spawn(
    store: PtyStore,
    app: AppHandle,
    cwd: String,
    argv: Vec<String>,
    plugin_id: Option<String>,
    task_id: Option<String>,
) -> Result<String, String> {
    if argv.is_empty() {
        return Err("argv cannot be empty".to_string());
    }

    let task_id = task_id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let pty_system = NativePtySystem::default();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new(&argv[0]);
    cmd.args(&argv[1..]);
    cmd.cwd(&cwd);
    for (k, v) in std::env::vars() {
        cmd.env(k, v);
    }

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;

    let tid = task_id.clone();
    let app_clone = app.clone();
    let store_clone = store.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Err(err) => {
                    emit_task_log(
                        &app_clone,
                        Some(&tid),
                        "error",
                        "backend",
                        "pty.read",
                        err.to_string(),
                    );
                    break;
                }
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_clone.emit(
                        "pty_output",
                        serde_json::json!({
                            "taskId": tid,
                            "data": data,
                        }),
                    );
                }
            }
        }

        if let Ok(mut map) = store_clone.lock() {
            let mut exit_code: Option<u32> = None;
            if let Some(mut session) = map.remove(&tid) {
                match session.child.wait() {
                    Ok(status) => {
                        exit_code = Some(status.exit_code());
                    }
                    Err(err) => {
                        emit_task_log(
                            &app_clone,
                            Some(&tid),
                            "error",
                            "backend",
                            "pty.wait",
                            err.to_string(),
                        );
                    }
                }
            }

            let _ = app_clone.emit(
                "task_done",
                serde_json::json!({
                    "taskId": tid,
                    "exitCode": exit_code,
                }),
            );
        }
    });

    store.lock().unwrap().insert(
        task_id.clone(),
        PtySession {
            writer,
            _master: pair.master,
            child,
            plugin_id,
        },
    );

    Ok(task_id)
}

pub fn has_running_tasks_for_plugin(store: &PtyStore, plugin_id: &str) -> bool {
    let map = store.lock().unwrap();
    map.values()
        .any(|session| session.plugin_id.as_deref() == Some(plugin_id))
}

pub fn write_input(store: &PtyStore, task_id: &str, data: &str) -> Result<(), String> {
    let mut map = store.lock().unwrap();
    let session = map
        .get_mut(task_id)
        .ok_or_else(|| "task not found".to_string())?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())
}

pub fn kill_task(store: &PtyStore, task_id: &str) -> Result<(), String> {
    let mut map = store.lock().unwrap();
    if let Some(mut session) = map.remove(task_id) {
        let _ = session.child.kill();
    }
    Ok(())
}

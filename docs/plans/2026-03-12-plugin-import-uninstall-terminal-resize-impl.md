# Plugin Import/Uninstall + Terminal Resize Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement plugin import/uninstall workflows, enforce uninstall safety against running tasks, allow terminal height drag-resize, and move run action onto the config bar row.

**Architecture:** Add a backend `plugin_manager` module for import/uninstall file operations and validation, extend PTY session metadata with `plugin_id` so backend can block uninstall while running, and update React layout/components to expose import/uninstall controls and terminal resizing.

**Tech Stack:** Rust (Tauri commands), React + TypeScript, xterm.js, tauri dialog plugin.

---

### Task 1: Backend plugin manager and commands

**Files:**
- Create: `src-tauri/src/plugin_manager.rs`
- Modify: `src-tauri/src/lib.rs`

**Steps:**
1. Implement import from local directory with `plugin.json` validation and duplicate-id rejection.
2. Implement uninstall that removes plugin directory and matching config file.
3. Add Tauri commands `import_plugin` and `uninstall_plugin` and register in `invoke_handler`.

### Task 2: Runtime uninstall protection

**Files:**
- Modify: `src-tauri/src/pty_manager.rs`
- Modify: `src-tauri/src/lib.rs`

**Steps:**
1. Add `plugin_id` metadata to PTY sessions.
2. Pass `plugin_id` when spawning install/run tasks.
3. Add runtime query helper to check if a plugin has running tasks.
4. Use this helper in `uninstall_plugin` command to reject uninstall while running.

### Task 3: Frontend plugin actions and run button relocation

**Files:**
- Modify: `src/components/PluginSidebar.tsx`
- Modify: `src/components/ConfigBar.tsx`
- Modify: `src/components/PluginForm.tsx`
- Modify: `src/App.tsx`

**Steps:**
1. Add import and uninstall buttons in sidebar.
2. Wire import via folder picker and `import_plugin` invoke.
3. Wire uninstall with confirm dialog and `uninstall_plugin` invoke.
4. Move run button from `PluginForm` to `ConfigBar` right side.

### Task 4: Terminal panel drag resizing

**Files:**
- Modify: `src/App.tsx`

**Steps:**
1. Add terminal height state and drag handlers.
2. Add a draggable top border above terminal area.
3. Clamp height to min/max bounds and keep mobile/desktop stable.

### Task 5: Validation and handoff

**Files:**
- Modify: `docs/plans/2026-03-12-plugin-import-uninstall-terminal-resize-impl.md`

**Steps:**
1. Run `cd src-tauri && cargo test`.
2. Run `npm run build`.
3. Append validation results and residual risks to this plan.

### Validation Results
- `cd src-tauri && cargo test` passed (`13 passed, 0 failed`).
- `npm run build` passed (Vite production build completed successfully).

### Residual Risks
- Import currently supports local directories only (zip import is intentionally out of scope).
- Directory import copies all regular files recursively; very large plugin folders may take noticeable time.

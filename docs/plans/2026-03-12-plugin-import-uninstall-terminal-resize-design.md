# Plugin Import/Uninstall + Terminal Resize Design

**Date:** 2026-03-12  
**Project:** Reindeer Chopper

## Goal
Add plugin import (from local folder), plugin uninstall, resizable terminal height, and move the run action onto the config row.

## Confirmed Decisions
- Import source: local plugin directory only.
- Duplicate plugin id on import: reject with explicit error.
- Uninstall behavior: delete plugin directory and related config file.
- Running task protection: block uninstall when the plugin has running tasks.

## Approaches Considered
1. Frontend-only guardrails for uninstall and plugin state.
2. Backend-enforced import/uninstall rules with frontend as operator UI.
3. Minimal UI-only changes without runtime-aware uninstall checks.

## Recommendation
Use backend-enforced import/uninstall rules (approach 2). This keeps behavior deterministic and avoids state drift between UI and runtime.

## Scope
- Add Tauri commands for plugin import and uninstall.
- Add backend plugin manager module for validation/copy/remove.
- Track plugin ownership in PTY sessions to enforce uninstall blocking.
- Add UI actions in plugin sidebar for import and uninstall.
- Move run button to the config bar row.
- Add draggable top border on terminal area to resize height.

## Error Handling
- Import fails when source is invalid, `plugin.json` missing/invalid, or `id` already exists.
- Uninstall fails when plugin has running tasks.
- Uninstall removes `plugins/<id>` and `configs/<id>.json` together.

## Verification
- `cd src-tauri && cargo test`
- `npm run build`
- Manual smoke:
  - Import a plugin directory.
  - Verify duplicate id import is rejected.
  - Run plugin and verify uninstall is blocked while running.
  - Stop task and uninstall successfully.
  - Verify terminal area height can be resized by dragging top border.
  - Verify run button appears on config row and still runs selected config.

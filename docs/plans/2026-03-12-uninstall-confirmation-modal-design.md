# Uninstall Confirmation Modal Design

**Date:** 2026-03-12  
**Project:** Reindeer Chopper

## Goal
Require explicit confirmation before plugin uninstall, and allow users to decide whether the plugin config file should be deleted.

## Requirements
- Clicking `UNINSTALL PLUGIN` must open a confirmation modal first.
- Deletion must happen only after user clicks confirm in that modal.
- Modal must include a checkbox:
  - Label: delete config file together with plugin.
  - Default: unchecked.
- Modal UI must match existing product visual style.

## Approaches Considered
1. Keep browser `window.confirm` and add a second prompt for config deletion.
2. Build an in-app modal and pass a deletion flag to backend.
3. Split uninstall into two backend commands (plugin remove + config remove).

## Recommendation
Use approach 2. It provides a single-step, style-consistent UX and keeps backend behavior deterministic with one command payload.

## Scope
- Frontend modal state and interactions in `src/App.tsx`.
- Frontend modal styling in `src/index.css`.
- Backend uninstall command parameter extension in `src-tauri/src/lib.rs`.
- Backend conditional config deletion in `src-tauri/src/plugin_manager.rs`.

## Verification
- `npm run build`
- `cd src-tauri && cargo test`

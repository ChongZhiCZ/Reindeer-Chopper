# System Terminal Log Channel Implementation

## Summary
Implemented a structured non-PTY log channel and a fixed `System` terminal tab so application/runtime errors can be observed directly in xtermjs.

## Changed Files
- `src/types.ts`
- `src/hooks/useTerminal.ts`
- `src/components/TaskTabBar.tsx`
- `src/components/TerminalPanel.tsx`
- `src/App.tsx`
- `src-tauri/src/pty_manager.rs`
- `src-tauri/src/lib.rs`
- `docs/plans/2026-03-21-system-terminal-log-design.md`

## Key Changes
- Added `SYSTEM_TASK_ID` and `TaskLogEvent` types.
- Added frontend `task_log` event listener and terminal write helper.
- Added fixed non-closable `System` tab in task bar.
- Added permanent `System` terminal layer in panel rendering.
- Set initial active terminal to `System` and prevented auto-switch on errors.
- Logged frontend invoke failures into `System` terminal output.
- Added backend helper `emit_task_log`.
- Emitted backend errors for:
  - `run_plugin` descriptor read/parse/validate failures
  - command split failures
  - task spawn failures
  - PTY reader errors (`pty.read`)
  - PTY wait errors (`pty.wait`)
  - `pty_input` failures

## Verification
- `npm run build` ✅
- `cd src-tauri && cargo test` ✅ (17 passed)

## Residual Risks / Follow-ups
- `kill_task` currently has no explicit failure path in `pty_manager` for missing task id, so only transport-level failures are observable there.

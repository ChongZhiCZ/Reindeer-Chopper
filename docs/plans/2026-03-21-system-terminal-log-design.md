# System Terminal Log Channel Design

## Intent
Ensure application-level errors (frontend invoke failures and backend runtime/internal failures) are visible in xtermjs, not only PTY process output.

## Scope
- Keep existing `pty_output` behavior unchanged for task process stdout/stderr.
- Add a structured backend event `task_log` for non-PTY logs.
- Add a fixed, non-closable `System` terminal tab.
- Route logs without `taskId` to the `System` tab.
- Do not auto-switch active tab when errors happen.

## Event Contract
`task_log` payload:
- `taskId?: string`
- `level: 'info' | 'warn' | 'error'`
- `source: 'frontend' | 'backend'`
- `phase: string`
- `message: string`
- `ts: string` (RFC3339)

## UI Behavior
- `System` tab is always shown and cannot be closed.
- Existing task tabs remain closable.
- `System` terminal buffer is persistent in current app session.
- When logging errors, write to terminal buffer only; keep current active tab unchanged.

## Backend Behavior
Emit `task_log` on these non-PTY failure paths:
- `run_plugin`: descriptor read/parse/validate errors, command split errors, spawn failures.
- PTY manager reader loop: read error instead of silent break.
- PTY wait failure after process exit.
- `pty_input` and `kill_task` command failures.

## Compatibility
- No plugin descriptor schema changes.
- Existing `pty_output` and `task_done` events remain intact.
- Existing task success/error status by exit code remains unchanged.

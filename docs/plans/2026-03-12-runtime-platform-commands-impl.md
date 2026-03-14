# Runtime Platform Commands Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded Node/npm plugin execution with platform-specific runtime commands from `plugin.json`.

**Architecture:** Extend plugin descriptor schema to include `runtime.windows/mac` command blocks, validate required `run` fields during scan/import, and execute optional install + run commands per current platform via backend PTY spawn.

**Tech Stack:** Rust (Tauri commands), React + TypeScript.

---

### Task 1: Add runtime schema to descriptors and validation

**Files:**
- Modify: `src-tauri/src/plugin_scanner.rs`
- Modify: `src/types.ts`

**Steps:**
1. Add `runtime.windows` and `runtime.mac` structures with `run` required and `install` optional.
2. Validate `runtime.windows.run` and `runtime.mac.run` are non-empty.
3. Keep existing filepath `pathMode` validation.

### Task 2: Switch backend execution flow to platform runtime commands

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Steps:**
1. Select runtime command block from current platform.
2. Parse command strings into argv with quote-aware parsing.
3. Execute optional install command when present and deps are not marked installed.
4. Emit generic `install_started` event, then run command with generated plugin parameter flags.

### Task 3: Align frontend install event handling and sample plugin

**Files:**
- Modify: `src/App.tsx`
- Modify: `sample-plugins/hello-world/plugin.json`
- Modify: `src-tauri/src/plugin_manager.rs` (test fixtures)

**Steps:**
1. Update listener/event names from npm-specific to generic install flow.
2. Update sample plugin descriptor to `runtime.windows/mac` commands.
3. Update backend test fixtures to new schema.

### Task 4: Validation and handoff

**Files:**
- Modify: `docs/plans/2026-03-12-runtime-platform-commands-impl.md`

**Steps:**
1. Run `cd src-tauri && cargo test`.
2. Run `npm run build`.
3. Record outcomes and residual risks.

### Validation Results
- `cd src-tauri && cargo test` passed (`17 passed, 0 failed`).
- `npm run build` passed (Vite production build completed successfully).

### Migration Impact
- Plugin runtime no longer uses `entry`; execution now requires `runtime.windows.run` + `runtime.mac.run`.
- Existing plugins without `runtime` will be rejected on import and skipped during scanning.

### Residual Risks
- Command parser is quote-aware but intentionally minimal (no shell expansion/advanced escaping).
- Linux currently follows the `mac` runtime branch; schema is still explicitly windows/mac only.

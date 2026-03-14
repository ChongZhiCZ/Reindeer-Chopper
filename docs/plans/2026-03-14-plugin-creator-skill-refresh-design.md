# Plugin Creator Skill Refresh Design

**Date:** 2026-03-14  
**Project:** Reindeer Chopper

## Goal
Update the existing `reindeer-chopper-plugin-creator` skill so it reflects the current repository contract and runtime behavior, especially richer parameter support and platform runtime commands.

## Scope
- Update skill instructions in `.codex/skills/reindeer-chopper-plugin-creator/SKILL.md`.
- Update contract reference in `.codex/skills/reindeer-chopper-plugin-creator/references/plugin-contract.md`.
- Update bundled scaffold template files under `.codex/skills/reindeer-chopper-plugin-creator/assets/node-plugin-template/` to demonstrate current parameter capabilities.
- Validate the updated skill folder with quick validation tooling.

## Non-Goals
- No changes to app runtime code (`src/`, `src-tauri/`).
- No plugin descriptor schema changes.

## Key Decisions
1. Keep supported parameter types as `text | number | boolean | select | filepath`.
2. Require `pathMode: "file" | "directory"` whenever `type: "filepath"`.
3. Document that runtime commands are argv-parsed, not shell-interpreted by default, and compound install commands must be wrapped per platform shell.
4. Keep validator script as the primary local contract gate before app import.

## Acceptance Criteria
- Skill instructions and references match current code behavior.
- Template plugin demonstrates `select` and both `filepath` modes.
- Skill validates successfully with `quick_validate.py`.

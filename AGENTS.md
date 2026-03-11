# Reindeer-Chopper Agent Guide

## Mission
Use a harness-engineering workflow for this repository:
- Humans define intent, constraints, and acceptance criteria.
- Agents execute implementation batches with strict verification.
- Repo docs and checks are the control surface, not long chat context.

## Repository Map
- `src/`: React UI (plugin list, config form, task tabs, terminal panel)
- `src-tauri/`: Rust backend (plugin scan, config persistence, PTY/task runtime)
- `sample-plugins/`: local plugin examples
- `docs/plans/`: dated design and implementation plans
- `docs/harness-engineering.md`: operating model for human+agent collaboration

## Default Workflow (Harness Mode)
1. Write a short task brief in `docs/plans/YYYY-MM-DD-<topic>-design.md`.
2. Decide scope and constraints before editing code.
3. Implement in small, reviewable changes.
4. Run verification gates.
5. Record results and follow-ups in `docs/plans/YYYY-MM-DD-<topic>-impl.md`.

## Verification Gates
Run all relevant checks for the files touched:
- Frontend/app: `npm run build`
- Rust backend: `cd src-tauri && cargo test`
- Optional runtime smoke test: `npm run tauri dev`

## Guardrails
- Do not change plugin descriptor semantics without documenting migration impact.
- Keep command execution behavior deterministic and observable in terminal output.
- Prefer additive changes to `src/types.ts` and backend command payloads.
- Avoid destructive git operations unless explicitly requested.

## Definition Of Done
- Behavior matches task acceptance criteria.
- Relevant checks pass locally.
- Docs are updated for changed workflows.
- Handoff summary includes changed files, validation commands, and residual risks.

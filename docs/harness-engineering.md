# Harness Engineering Mode (Minimal Template)

## Purpose
This document defines how to run delivery in this repo with high agent throughput and low drift.

## Operating Loop
1. Human sets intent:
   - problem to solve
   - constraints
   - acceptance criteria
2. Agent prepares:
   - design note in `docs/plans/*-design.md`
   - execution plan in `docs/plans/*-impl.md`
3. Agent executes:
   - code + tests + docs updates
4. Human reviews:
   - focus on behavior, risk, and correctness
5. Agent follows up:
   - fixes review findings
   - updates docs and verification record

## Required Artifacts
- Design note: `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Implementation plan or execution log: `docs/plans/YYYY-MM-DD-<topic>-impl.md`
- Repo-level execution rules: `AGENTS.md`

## Quality Controls
- Source of truth is repository files, not chat history.
- Every task includes explicit verification commands and outcomes.
- Prefer small commits and short review cycles.

## Quick Start
1. Add or update a design note.
2. Implement the smallest valid slice.
3. Run:
   - `npm run build`
   - `cd src-tauri && cargo test`
4. Commit with a scoped message (`feat:`, `fix:`, `docs:`).
5. Hand off with:
   - changed files
   - validation run
   - known limitations

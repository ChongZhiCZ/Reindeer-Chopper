# Harness Mode Documentation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a minimal harness-engineering documentation baseline for Reindeer-Chopper.

**Architecture:** Keep workflow control at repo root (`AGENTS.md`) and put operational explanation in one docs page. Preserve lightweight process with dated design/implementation records.

**Tech Stack:** Markdown docs, existing npm/cargo verification commands.

---

### Task 1: Add Repository Agent Guide

**Files:**
- Create: `AGENTS.md`

**Step 1:** Define mission, repo map, workflow, verification gates, guardrails, and done criteria.

**Step 2:** Ensure commands match this repository:
- `npm run build`
- `cd src-tauri && cargo test`

### Task 2: Add Harness Operating Doc

**Files:**
- Create: `docs/harness-engineering.md`

**Step 1:** Document the human-agent loop and required artifacts.

**Step 2:** Add a quick-start sequence with explicit validation commands.

### Task 3: Add Plan Records

**Files:**
- Create: `docs/plans/2026-03-12-harness-mode-design.md`
- Create: `docs/plans/2026-03-12-harness-mode-impl.md`

**Step 1:** Record approach options and recommendation in the design note.

**Step 2:** Record implementation tasks in this plan for traceability.

### Verification
- Doc-only change: structural review for path/command correctness.

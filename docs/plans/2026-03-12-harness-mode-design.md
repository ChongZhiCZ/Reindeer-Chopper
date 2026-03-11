# Harness Mode Documentation Design

**Date:** 2026-03-12  
**Project:** Reindeer Chopper

## Goal
Add a minimal but executable harness-engineering documentation set for this repo.

## Approaches Considered
1. Single-file only (`AGENTS.md`): fastest, but lacks shared operating context.
2. Full playbook tree (`docs/harness/*` many files): comprehensive, but heavy for early stage.
3. Minimal two-layer model (recommended): `AGENTS.md` + one `docs/harness-engineering.md` + dated plans.

## Recommendation
Use approach 3. It is small enough to maintain while still giving agents a stable control surface.

## Scope
- Add root-level `AGENTS.md`.
- Add `docs/harness-engineering.md`.
- Add dated plan records for traceability.

## Out Of Scope
- CI pipeline restructuring
- PR template automation
- Additional lint/test tooling

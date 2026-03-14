# Runtime Platform Commands Design

**Date:** 2026-03-12  
**Project:** Reindeer Chopper

## Goal
Move plugin execution/install behavior from hardcoded Node/npm logic to plugin-defined, per-platform runtime commands.

## Confirmed Decisions
- `plugin.json` is the only runtime source of truth; README is documentation-only.
- `runtime.windows.run` and `runtime.mac.run` are required.
- `runtime.<platform>.install` is optional; missing means no dependency installation step.
- No preflight `check` field for now; runtime failures are surfaced in terminal output.

## Descriptor Shape
```json
{
  "runtime": {
    "windows": {
      "run": "python main.py",
      "install": "pip install -r requirements.txt"
    },
    "mac": {
      "run": "python3 main.py",
      "install": "pip3 install -r requirements.txt"
    }
  }
}
```

## Approach
1. Extend frontend/backend plugin descriptor types with `runtime.windows/mac`.
2. Validate runtime fields when scanning/importing plugins.
3. Replace hardcoded `npm install` + `node entry` in backend `run_plugin` with:
   - platform `install` (if present, once per plugin unless skipped), then
   - platform `run` with generated parameter flags appended.
4. Rename install lifecycle event from npm-specific to generic (`install_started`).

## Migration Impact
- `entry` is no longer used for execution.
- Plugins missing `runtime.windows.run` or `runtime.mac.run` become invalid and are skipped/rejected.
- Existing Node-based plugins must migrate by adding runtime commands (e.g. `node index.js`, optional `npm install`).

## Verification
- `cd src-tauri && cargo test`
- `npm run build`
- Manual smoke:
  - Run a plugin with `install` present and verify install task appears, then run task starts.
  - Run a plugin without `install` and verify run task starts directly.

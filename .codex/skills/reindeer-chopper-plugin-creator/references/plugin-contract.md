# Reindeer Chopper Plugin Contract

Use this reference when creating or fixing a plugin for this repository.

## Descriptor Shape (`plugin.json`)

Required top-level fields:
- `id`: string, safe pattern `^[A-Za-z0-9_-]+$`
- `name`: string
- `version`: string (semver style recommended)
- `runtime`: object with per-platform commands:
  - `runtime.windows.run`: non-empty string
  - `runtime.mac.run`: non-empty string
  - `runtime.<platform>.install`: optional string
- `parameters`: array

Optional top-level fields:
- `description`: string

Each parameter object:
- `name`: string, unique inside the plugin
- `label`: string, UI label
- `type`: one of `text`, `number`, `boolean`, `select`, `filepath`
- `required`: optional boolean
- `description`: optional string
- `default`: optional (`string | number | boolean`)
- `options`: optional string array, required for practical `select` usage and required by bundled validator for `select`
- `pathMode`: required when `type` is `filepath`, must be `file` or `directory`

Type-specific default expectations:
- `text` / `filepath` / `select`: `default` should be string
- `number`: `default` should be number
- `boolean`: `default` should be boolean
- `select`: `default` should be one of `options`

## Runtime Invocation Rules

Backend runtime behavior (`run_plugin`) maps params to CLI args:
- `true` boolean -> append `--<name>`
- `false` boolean -> append nothing
- `null` -> append nothing
- string/number -> append `--<name> <value>`

The command shape is:
- `<runtime.<platform>.run> [flags...]`

Runtime commands are argv-parsed (quote-aware) and are not run through a shell by default.
For compound commands, wrap with platform shell explicitly:
- Windows: `cmd /C "<compound command>"`
- macOS: `sh -lc '<compound command>'`

## Import and Uninstall Rules

Import command validates:
- Source directory exists.
- `plugin.json` exists and is valid JSON.
- `id` passes safe-id pattern.
- `runtime.windows.run` / `runtime.mac.run` are present and non-empty.
- `filepath` parameters must define valid `pathMode`.
- No duplicate plugin id in app data.

Uninstall command:
- Refuses unsafe ids.
- Refuses uninstall while plugin has running tasks.
- Removes `plugins/<id>` and matching `configs/<id>.json`.

Run command validates descriptor again before launching.

## Authoring Guidance

- Keep `name` and `label` human-readable for UI clarity.
- Keep runtime commands explicit in `runtime.windows/mac`.
- Keep `select` defaults inside `options`.
- Set `required: true` only for values that must be non-empty before run.
- Keep output deterministic to improve terminal observability.

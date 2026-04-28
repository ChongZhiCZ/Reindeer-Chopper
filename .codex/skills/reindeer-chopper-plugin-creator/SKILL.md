---
name: reindeer-chopper-plugin-creator
description: Create, scaffold, and validate Reindeer Chopper Node.js plugins that match the current plugin.json contract (runtime.windows/mac, rich parameter types, filepath pathMode) and runtime CLI argument mapping. Use when Codex needs to build a new plugin folder, migrate an old descriptor, fix import/run validation failures, or prepare a plugin for import and execution in the Reindeer Chopper desktop app.
---

# Reindeer Chopper Plugin Creator

Create a plugin folder that imports cleanly and runs correctly in Reindeer Chopper.

## Workflow

### 1) Confirm descriptor inputs
Collect these values first:
- `plugin_id`: Must match `^[A-Za-z0-9_-]+$`.
- `plugin_name`: Human-readable UI name.
- `version`: Keep semver style (for example `1.0.0`).
- `description`: Optional short purpose statement.
- `runtime.windows.run` and `runtime.mac.run`: required non-empty command strings.
- `runtime.<platform>.install`: optional per-platform install commands.
- `parameters`: ordered list of form fields.

Read `references/plugin-contract.md` for the exact descriptor and runtime mapping.

### 2) Scaffold from template
Prefer deterministic scaffolding over hand-written boilerplate:

```bash
python3 .codex/skills/reindeer-chopper-plugin-creator/scripts/scaffold_plugin.py \
  --id image-resizer \
  --name "Image Resizer" \
  --description "Resize images from CLI flags" \
  --dest /tmp/reindeer-plugins
```

### 3) Author descriptor with current parameter contract
Supported `parameters[*].type`:
- `text`
- `textarea`
- `number`
- `boolean`
- `select` (use non-empty `options`, keep `default` inside options)
- `filepath` (must set `pathMode: "file" | "directory"`)

Rules:
- Keep parameter `name` values unique.
- Use `required: true` only for fields that must be non-empty at run time.
- Match `default` type to parameter type.

### 4) Implement runtime command behavior
Write `index.js` to consume flags in this shape:
- `--param value` for text/textarea/number/select/filepath
- `--flag` for boolean `true`

Runtime command strings are argv-parsed, not shell-expanded. For compound commands (`&&`, env exports, shell built-ins), wrap explicitly per platform:
- Windows example: `cmd /C "npm install && npx playwright install chromium"`
- macOS example: `sh -lc 'npm install && npx playwright install chromium'`

### 5) Validate before import
Run the validator before importing:

```bash
python3 .codex/skills/reindeer-chopper-plugin-creator/scripts/validate_plugin.py /tmp/reindeer-plugins/image-resizer
```

Fix all reported errors. Do not import invalid descriptors.

### 6) Verify in app workflow
Import plugin in app and run one config.
If app/backend code was touched in the same task, run repository gates:
- `npm run build`
- `cd src-tauri && cargo test`

## Runtime Mapping Rules
Backend parameter to CLI mapping:
- `boolean: true` -> append `--<name>`
- `boolean: false` -> omit
- `null` -> omit
- string/number -> append `--<name> <value>`

Install lifecycle:
- If current platform has `runtime.<platform>.install` and deps are not marked installed, app starts an install task first.
- After install succeeds, frontend reruns plugin with `skipInstall=true`.

## Bundled Resources
- `references/plugin-contract.md`: Canonical descriptor and runtime contract.
- `scripts/scaffold_plugin.py`: Deterministic plugin scaffold generator.
- `scripts/validate_plugin.py`: Local contract validator.
- `assets/node-plugin-template/`: Template with rich parameter examples.

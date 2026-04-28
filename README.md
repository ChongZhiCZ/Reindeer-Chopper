# Reindeer Chopper

Reindeer Chopper is a desktop app for running small local tools through a friendly form and a live terminal. Pick a plugin, fill in its parameters, save reusable configs, and run it without memorizing command-line flags.

## What You Can Do

- Import local plugin folders.
- Fill plugin forms generated from `plugin.json`.
- Save, select, update, and delete parameter configs.
- Run multiple plugin tasks in terminal tabs.
- Watch install and runtime logs inside the app.

## Getting The App

Download the package for your platform from the project release page when available:

- macOS: `.dmg`
- Windows: `.exe` or `.msi`

After installation, launch `reindeer-chopper` like a normal desktop app.

## First Run

1. Open Reindeer Chopper.
2. Click the import action in the plugin sidebar.
3. Select a plugin folder that contains a `plugin.json`.
4. Choose the imported plugin from the sidebar.
5. Fill in the form.
6. Save the config if you want to reuse it.
7. Click run and watch the terminal tab.

The repository includes sample plugins under `sample-plugins/`:

- `hello-world`: demonstrates text, textarea, number, select, boolean, and file path parameters.
- `playwright-screenshot`: opens a URL and saves a screenshot to a selected folder.

## Plugin Folders

A plugin is a folder with a descriptor file named `plugin.json`. Node.js plugins commonly also include `index.js` and `package.json`.

Minimal shape:

```json
{
  "id": "hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "description": "Greet someone from a local script",
  "runtime": {
    "windows": {
      "run": "node.cmd index.js",
      "install": "npm.cmd install"
    },
    "mac": {
      "run": "node index.js",
      "install": "npm install"
    }
  },
  "parameters": [
    {
      "name": "name",
      "label": "Your Name",
      "type": "text",
      "required": true,
      "default": "World"
    }
  ]
}
```

`runtime.<platform>.install` is optional. If present, Reindeer Chopper runs it before the first plugin run on that platform.

## Form Parameters

Each item in `parameters` becomes one field in the app. The field `name` is also the command-line flag passed to the plugin script.

| Type | UI | Runtime value |
| --- | --- | --- |
| `text` | Single-line text input | `--name value` |
| `textarea` | Fixed 3-line text area | `--name value` |
| `number` | Numeric stepper input | `--name value` |
| `boolean` | Checkbox | `--name` when true, omitted when false |
| `select` | Dropdown | `--name selectedValue` |
| `filepath` | Text input with picker | `--name /selected/path` |

Useful parameter fields:

- `name`: unique flag name, such as `url` or `outputDir`.
- `label`: user-facing field label.
- `type`: one of the supported parameter types.
- `required`: prevents running while the value is empty.
- `default`: initial value.
- `description`: short helper text under the field.
- `options`: required for `select`.
- `pathMode`: required for `filepath`; use `"file"` or `"directory"`.

Example textarea parameter:

```json
{
  "name": "note",
  "label": "Extra Note",
  "type": "textarea",
  "default": "Write a short note here.",
  "description": "Multi-line text passed to the script as one value."
}
```

## How Scripts Receive Values

Reindeer Chopper launches the platform-specific `run` command and appends parameter flags in descriptor order.

For this config:

```json
{
  "name": "Ada",
  "note": "Line one\nLine two",
  "loud": true
}
```

The script receives arguments like:

```sh
node index.js --name Ada --note "Line one
Line two" --loud
```

The command is parsed as arguments, not as a shell string. If your run or install command needs shell features such as `&&`, wrap it explicitly:

- Windows: `cmd /C "npm install && node index.js"`
- macOS: `sh -lc 'npm install && node index.js'`

## Troubleshooting

- Plugin does not appear: make sure the selected folder contains a valid `plugin.json`.
- File picker parameter fails to import: `filepath` parameters must include `pathMode`.
- Run button is disabled: fill every required field.
- Dependency install fails: inspect the system terminal tab for the install command output.
- macOS says the app is damaged after downloading: the current release package is unsigned; remove the quarantine flag for local testing or build from source.

## Building From Source

Most users do not need this. For local development:

```sh
npm install
npm run tauri dev
```

Build packages:

```sh
npm run dist:mac
npm run dist:win
```

Build outputs are written under `src-tauri/target/release/bundle/`.

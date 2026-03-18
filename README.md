# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Distribution Builds

- macOS package (`.dmg`):
  - `npm run dist:mac`
- Windows packages (`.exe` + `.msi`):
  - `npm run dist:win` (run on Windows host)

Build outputs are under `src-tauri/target/release/bundle/`.

CI workflow:
- `.github/workflows/desktop-distribution.yml`
- Trigger manually with `workflow_dispatch` or push a `v*` tag to build both macOS and Windows artifacts.

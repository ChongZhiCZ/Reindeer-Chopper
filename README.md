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

### macOS Release signing

GitHub Release `.dmg` files must be signed and notarized. Local builds can run without this, but a downloaded `.dmg` gets a macOS quarantine flag and Gatekeeper may report the app as damaged if the Release asset is unsigned or not notarized.

For `v*` tag builds, configure these GitHub Actions secrets before publishing:

- `APPLE_CERTIFICATE`: base64 encoded Developer ID Application `.p12`.
- `APPLE_CERTIFICATE_PASSWORD`: password used when exporting the `.p12`.
- `APPLE_ID`: Apple Developer account email.
- `APPLE_PASSWORD`: app-specific password for notarization.
- `APPLE_TEAM_ID`: Apple Developer Team ID.
- `KEYCHAIN_PASSWORD`: random password for the temporary CI keychain.

Example certificate secret generation on macOS:

```sh
base64 -i ./DeveloperIDApplication.p12 | tr -d '\n' | pbcopy
```

Manual `workflow_dispatch` builds remain useful for unsigned test packages. If you need to inspect an old unsigned local install on your own machine, this can remove the quarantine flag, but it is not a replacement for signing Release assets:

```sh
xattr -dr com.apple.quarantine /Applications/reindeer-chopper.app
```

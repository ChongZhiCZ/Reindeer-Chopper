# macOS Release Signing 实现记录

## 实施内容
- `.github/workflows/desktop-distribution.yml`
  - 为 `v*` tag 的 macOS 构建新增签名 secret 校验。
  - 将 `APPLE_CERTIFICATE` 导入临时 keychain，并确认其中存在 Developer ID Application 身份。
  - 在 tag 构建时把 `APPLE_CERTIFICATE`、`APPLE_CERTIFICATE_PASSWORD`、`APPLE_ID`、`APPLE_PASSWORD`、`APPLE_TEAM_ID` 传给 Tauri CLI。
  - 构建后对 `.dmg` 执行 `codesign`、`stapler validate` 和 `spctl` 校验。
  - 构建结束后清理临时 keychain。
- `README.md`
  - 记录 GitHub Release 下载后提示损坏的原因：未签名/未公证 DMG 会被 Gatekeeper 拦截。
  - 记录 Release 所需 GitHub Actions secrets。
  - 记录本地检查旧未签名安装包时可用的 quarantine 临时绕过命令。
- `docs/plans/2026-04-28-macos-release-signing-design.md`
  - 记录问题背景、范围、约束和验收标准。

## 验证命令
- `npm run build`
- `cd src-tauri && cargo test`
- `git diff --check`
- `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/desktop-distribution.yml"); puts "workflow YAML parsed"'`
- `npm run tauri build -- --help`

## 验证结果
- `npm run build`：通过；保留既有 Vite chunk size warning。
- `cd src-tauri && cargo test`：通过，17 passed。
- `git diff --check`：通过。
- Workflow YAML 解析：通过。
- Tauri build help：通过，确认当前 CLI 支持 `--skip-stapling`、`--no-sign` 等 macOS 签名相关选项。

## 后续发布操作
- 在 GitHub repository secrets 中配置：
  - `APPLE_CERTIFICATE`
  - `APPLE_CERTIFICATE_PASSWORD`
  - `APPLE_ID`
  - `APPLE_PASSWORD`
  - `APPLE_TEAM_ID`
  - `KEYCHAIN_PASSWORD`
- 删除或弃用旧的未签名 Release DMG。
- 重新推送一个新的 `v*` tag，让 workflow 生成新的已签名/已公证 DMG。本次发布使用 `v0.1.1`。

## 残余风险
- 当前本机没有 Apple Developer secrets，无法在本地完成真实 CI signing/notarization 端到端验证。
- 首次 tag 发布仍需在 GitHub Actions 日志中确认 Apple 凭据、证书导出格式和 Team ID 均正确。
- 如果旧 Release 资产已被用户下载，仍会继续提示损坏；需要替换 Release 资产或发布新版本。

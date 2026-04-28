# macOS Release Signing 设计说明

## 问题背景
- 本地构建或本地运行可启动，但从 GitHub Release 下载 `.dmg` 后，macOS 提示应用已损坏。
- 现有桌面分发设计明确跳过签名/公证，tag Release 会把未签名 `.dmg` 直接上传。
- GitHub 下载的应用带有 quarantine 标记，macOS Gatekeeper 会对外部分发应用执行更严格校验；未签名/未公证包会被拦截。

## 任务目标
- 让 `v*` tag 触发的 macOS Release `.dmg` 使用 Developer ID 证书签名并完成 notarization/staple。
- 在缺少签名密钥时阻止 tag Release 继续上传损坏体验的 macOS 产物。
- 保留手动触发 workflow 作为未签名测试包构建入口。

## 范围
- `.github/workflows/desktop-distribution.yml`
  - macOS tag 构建前校验 Apple 签名/公证 secrets。
  - 导入 Developer ID Application `.p12` 证书到临时 keychain。
  - 将 Tauri CLI 所需的 Apple 签名/公证环境变量传入构建步骤。
  - 构建后验证 `.dmg` 已签名并带有 notarization ticket。
- `README.md`
  - 记录 Release 所需 GitHub Secrets 和本地快速绕过说明。
- `docs/plans/2026-04-28-macos-release-signing-impl.md`
  - 记录实施与验证结果。

## 约束
- 不改变插件 descriptor 语义。
- 不改变应用运行时命令执行行为。
- 不把证书、密码或 Apple 账号信息写入仓库。
- 不强制普通手动构建必须具备 Apple Developer 凭据。

## 验收标准
- `workflow_dispatch` 仍可构建 macOS/Windows 测试产物。
- `v*` tag 构建 macOS 包时，如果签名/公证 secrets 缺失，workflow 明确失败。
- `v*` tag 构建 macOS 包时，如果 secrets 完整，Tauri build 执行签名与 notarization，Release 上传的是已签名 `.dmg`。
- 文档列出所需 secrets、生成证书的预期格式和用户侧临时绕过命令。

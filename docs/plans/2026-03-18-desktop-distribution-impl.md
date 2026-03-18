# Desktop Distribution Implementation

## 实施内容
- `package.json`
  - 新增 `dist:mac`：`npm run tauri build -- --bundles dmg`
  - 新增 `dist:win`：`npm run tauri build -- --bundles nsis,msi`
- `.github/workflows/desktop-distribution.yml`
  - 新增跨平台分发工作流。
  - `workflow_dispatch` 手动触发，或推送 `v*` tag 自动触发。
  - `macos-latest` 产出 `.dmg`。
  - `windows-latest` 产出 `NSIS(.exe)` 和 `MSI(.msi)`。
  - 通过 `actions/upload-artifact@v4` 上传产物。
- `README.md`
  - 新增分发章节，补充本地命令、产物路径和 CI 触发方式。
- `docs/plans/2026-03-18-desktop-distribution-design.md`
  - 记录本任务设计范围与验收标准。

## 验证命令
- `npm run build`
- `cd src-tauri && cargo test`
- `npm run dist:mac`

## 验证结果
- `npm run build`：通过。
- `cd src-tauri && cargo test`：通过（17 passed, 0 failed）。
- `npm run dist:mac`：通过，产物：
  - `src-tauri/target/release/bundle/dmg/reindeer-chopper_0.1.0_aarch64.dmg`

## 说明
- 在当前沙箱环境下，`hdiutil` 受限会导致 DMG 打包失败；使用提权执行后可成功生成 DMG。
- Windows 包未在当前 macOS 本机执行构建，改由新增 CI 工作流在 `windows-latest` 原生构建。

## 残余风险
- 当前产物为未签名/未公证安装包，macOS 与 Windows 可能出现系统安全提示。
- Windows 打包结果依赖 CI 环境与 runner 可用性，需在 GitHub Actions 首次触发时确认产物完整性。

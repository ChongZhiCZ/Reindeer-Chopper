# Desktop Distribution 设计说明

## 任务目标
- 为当前 Tauri v2 项目提供可重复执行的桌面分发流程。
- 产出 macOS 和 Windows 安装包，便于测试与发布。

## 范围
- `package.json`：新增分发相关脚本（按平台构建）。
- `.github/workflows/desktop-distribution.yml`：新增跨平台构建工作流，分别在 macOS/Windows runner 打包并上传产物。
- 文档补充：记录本地与 CI 打包命令、产物路径和注意事项。

## 约束
- 不改动现有插件 descriptor 语义。
- 不引入签名/公证流程（仅生成未签名分发包）。
- Windows 包由 Windows runner 原生构建，不在 macOS 本地做复杂交叉编译链配置。

## 验收标准
- 本地可执行 mac 分发命令并产出 `.dmg`。
- CI 可一键触发并产出：
  - macOS: `.dmg`
  - Windows: `.exe`(NSIS) 和 `.msi`
- 基础门禁通过：`npm run build`、`cd src-tauri && cargo test`。

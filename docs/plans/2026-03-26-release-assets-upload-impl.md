# GitHub Release 资产上传实现记录

## 实施内容
- 修改 `.github/workflows/desktop-distribution.yml`：
  - 新增 `release-assets` job：
    - 仅在 `refs/tags/v*` 条件下执行。
    - 依赖 `build-desktop` 完成后运行。
    - 使用 `actions/download-artifact@v4` 下载并合并构建产物。
    - 使用 `softprops/action-gh-release@v2` 将 `.dmg`、`.exe`、`.msi` 上传到对应 tag 的 GitHub Release。
  - 为 `release-assets` job 增加 `permissions.contents: write`，允许写入 Release 资产。

## 验证命令
- `git diff -- .github/workflows/desktop-distribution.yml`

## 验证结果
- Workflow 语义检查通过（人工审阅）：
  - `build-desktop` 仍负责跨平台构建和 artifact 上传。
  - `release-assets` 仅在 `v*` tag 下执行，不影响普通手动分发流程。
  - Release 上传目标文件后缀与现有产物一致（`.dmg`/`.exe`/`.msi`）。

## 残余风险
- GitHub Release 上传为 CI 侧行为，需在首次 `v*` tag 触发时在 Actions 页面确认产物是否完整附加。

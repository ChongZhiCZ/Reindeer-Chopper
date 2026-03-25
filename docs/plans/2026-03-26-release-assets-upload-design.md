# GitHub Release 资产上传设计说明

## 任务目标
- 当推送 `v*` tag 时，除现有构建分发（artifact）外，还要把安装包附加到 GitHub Release。

## 范围
- 修改 `.github/workflows/desktop-distribution.yml`：
  - 保留现有 matrix 构建与 `actions/upload-artifact`。
  - 新增发布 job，在 `v*` tag 下下载所有 artifact 并上传到对应 Release。

## 约束
- 不改变现有构建脚本（`dist:mac` / `dist:win`）和产物类型。
- 不改动插件 descriptor 语义和后端运行逻辑。
- 仅在 tag 触发时执行 Release 上传，手动触发不强制上传。

## 验收标准
- `v*` tag 触发后，workflow 产出仍可在 Actions artifacts 中下载。
- 同一次 workflow 会把 `.dmg`、`.exe`、`.msi` 上传到同 tag 的 GitHub Release。

# Select Support And Style 设计说明

## 任务目标
- 为内置 `hello-world` 插件增加 `select` 类型参数，并提供“自述”选项。
- 让配置栏 select 与参数表单 select 在视觉上保持一致。

## 范围
- `sample-plugins/hello-world/plugin.json`：新增 `mode` 参数，`options` 包含 `问候` / `自述`。
- `sample-plugins/hello-world/index.js`：执行脚本解析 `--mode`，支持 `自述` 输出路径。
- `src/index.css`：统一 `.control-select` 与 `.field-select` 的下拉箭头、焦点态、内边距与背景。

## 约束
- 不修改插件 descriptor 现有语义。
- 不调整后端命令协议，仅使用既有 `--<param>` 参数传递方式。

## 验收标准
- 选择 `mode=自述` 时，执行输出体现自述内容。
- 配置选择下拉与表单下拉在边框、箭头、焦点态上风格一致。
- 前端构建通过：`npm run build`。

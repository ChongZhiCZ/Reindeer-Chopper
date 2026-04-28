# Textarea Parameter Design

## 任务目标
- 新增 `textarea` 插件参数类型，用于多行文本输入。
- `textarea` 在 UI 中固定显示 3 行高度。
- 在内置 `hello-world` 插件中增加可运行示例。
- 更新 README，使其主要面向使用者理解安装、导入、配置和运行插件。

## 范围
- 前端 descriptor 类型增加 `textarea`，表单渲染新增 `TextareaField`。
- 后端命令映射不变：`textarea` 值作为普通字符串传给 `--<name> <value>`。
- `hello-world` 新增 `note` textarea 参数，并在执行输出中打印多行内容。
- 插件创建器的 contract、validator、模板同步支持 `textarea`。
- README 改写为用户指南。

## 约束
- 不改变已有 `text`、`number`、`boolean`、`select`、`filepath` 参数语义。
- 不新增后端特殊类型分支，保持命令执行行为可观察、可预测。
- `textarea` 高度固定为 3 行，不允许拖拽改变尺寸。

## 验收标准
- `plugin.json` 中声明 `type: "textarea"` 时，表单显示 3 行固定高度文本域。
- 保存配置和运行插件时，textarea 内容以字符串传入脚本。
- `hello-world` 示例可通过 `--note` 输出 textarea 内容。
- `npm run build` 通过。

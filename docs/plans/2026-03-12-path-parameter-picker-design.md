# Path Parameter Picker Design

**Date:** 2026-03-12  
**Project:** Reindeer Chopper

## Goal
让脚本参数支持通过系统文件浏览器选择路径，并区分两种模式：选择文件、选择文件夹。

## Confirmed Decisions
- 仅保留 `type: "filepath"` 作为路径参数类型。
- 通过新增 `pathMode` 字段区分浏览器模式：`"file" | "directory"`。
- 不做默认回退；`filepath` 缺少或填写非法 `pathMode` 视为无效配置。
- 参数值仍保存为字符串路径，运行时命令拼装逻辑不变。

## Approaches Considered
1. 新增参数类型 `dirpath` 与 `filepath` 并行。
2. 保持单一 `filepath`，增加 `pathMode` 元数据。
3. 对 `text` 类型做自动路径识别。

## Recommendation
采用方案 2：单一 `filepath` + `pathMode`。描述符更统一，避免新增类型分支。

## Scope
- 前端参数定义新增 `pathMode`。
- 后端扫描结构透传 `pathMode`。
- 路径字段组件根据 `pathMode` 选择 file/directory 浏览器。
- 后端在插件扫描、导入和运行前校验 `filepath` 的 `pathMode`，不接受旧格式。

## Plugin Schema Example
```json
{
  "name": "outputPath",
  "label": "输出目录",
  "type": "filepath",
  "pathMode": "directory"
}
```

## Verification
- `npm run build`
- `cd src-tauri && cargo test`

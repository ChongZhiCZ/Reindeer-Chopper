# Path Parameter Picker Implementation

**Date:** 2026-03-12  
**Project:** Reindeer Chopper

## Summary
路径参数改为单一类型：
- `type: "filepath"`
- `pathMode: "file" | "directory"` 区分文件/文件夹选择器

不再使用 `dirpath`。

## Changed Files
- `src/types.ts`
- `src/components/fields/FilePathField.tsx`
- `src/components/PluginForm.tsx`
- `src-tauri/src/plugin_scanner.rs`
- `docs/plans/2026-03-12-path-parameter-picker-design.md`

## Implementation Notes
- 参数类型定义移除 `dirpath`，新增 `pathMode?: 'file' | 'directory'`。
- 后端 `ParameterDescriptor` 新增 `path_mode`（序列化字段名 `pathMode`）透传给前端。
- 后端新增 descriptor 校验：`filepath` 缺少或非法 `pathMode` 时，扫描跳过、导入拒绝、运行拒绝。
- `PluginForm` 中 `filepath` 根据 `pathMode` 决定 `FilePathField` 的 `mode`。
- `FilePathField` 内部通过 Tauri `open({ directory: ... })` 切换系统选择器。

## Verification
- `npm run build` ✅
- `cd src-tauri && cargo test` ✅

## Residual Risks
- 旧 `filepath` 描述符（未写 `pathMode`）会被判为无效并拒绝加载/导入。
- 目前不做路径存在性预校验，路径有效性仍由脚本运行阶段处理。

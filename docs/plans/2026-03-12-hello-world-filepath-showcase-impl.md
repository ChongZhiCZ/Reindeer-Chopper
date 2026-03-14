# Hello World Filepath Showcase Implementation

**Date:** 2026-03-12  
**Project:** Reindeer Chopper

## Summary
`hello-world` 示例插件新增 `filepath` 参数演示，分别展示文件选择与目录选择两种模式，并在运行日志输出所选路径信息。

## Changed Files
- `sample-plugins/hello-world/plugin.json`
- `sample-plugins/hello-world/index.js`
- `docs/plans/2026-03-12-hello-world-filepath-showcase-design.md`
- `docs/plans/2026-03-12-hello-world-filepath-showcase-impl.md`

## Implementation Notes
- `plugin.json` 新增：
  - `inputFile` (`type: "filepath"`, `pathMode: "file"`)
  - `outputDir` (`type: "filepath"`, `pathMode: "directory"`)
- `index.js` 新增参数解析与输出函数：
  - 解析 `--inputFile` / `--outputDir`
  - 输出选中文件/目录及其 basename
  - 未选择时输出提示文案，便于演示默认行为

## Verification
- `npm run build` ✅
- `cd sample-plugins/hello-world && node index.js --name Tester --count 1 --inputFile /tmp/demo.txt --outputDir /tmp` ✅

## Residual Risks
- 示例脚本不校验路径是否存在，仍按演示目的仅打印传入参数。

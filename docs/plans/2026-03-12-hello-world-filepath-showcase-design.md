# Hello World Filepath Showcase Design

**Date:** 2026-03-12  
**Project:** Reindeer Chopper

## Goal
在 `sample-plugins/hello-world` 示例中展示新 `filepath` 参数能力，覆盖两种模式：
- `pathMode: "file"`
- `pathMode: "directory"`

## Approaches Considered
1. 只新增一个 `filepath(file)` 参数，最小改动但展示不完整。
2. 同时新增 `filepath(file + directory)` 两个参数，完整展示新能力。
3. 保持参数不变，仅在脚本文案提及 `filepath`，没有可运行演示价值。

## Recommendation
采用方案 2。示例插件在 UI 中能直接看到两个路径选择器，运行日志也能验证参数透传。

## Scope
- 更新 `sample-plugins/hello-world/plugin.json`，新增两个 `filepath` 参数。
- 更新 `sample-plugins/hello-world/index.js`，解析并打印文件/目录参数。
- 保持原有问候与 ora 演示逻辑不变。

## Verification
- `npm run build`
- 手动运行 hello-world 配置，验证路径参数输出

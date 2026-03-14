# Playwright Screenshot Plugin Design

**Date:** 2026-03-12  
**Project:** Reindeer Chopper

## Goal
在 `sample-plugins` 新增一个 Node.js + Playwright 示例插件。运行时接收三个参数：
- 网站 URL
- 输出文件夹
- 无头模式

插件执行后打开指定网站并截图到指定目录。

## Approaches Considered
1. 使用 Playwright Chromium 启动浏览器并截图，最贴近真实自动化场景。
2. 使用 Puppeteer 实现截图，依赖和技术栈与需求不符。
3. 不引入浏览器库，仅模拟输出，无法满足截图需求。

## Recommendation
采用方案 1，参数映射遵循 Reindeer Chopper 运行契约：
- `--url <value>`
- `--outputDir <value>`
- `--headless`（布尔真值时出现）

同时遵循更新后的描述符约定，使用 `runtime.windows/mac` 作为执行入口（不再依赖 `entry`）。

## Scope
- 在 `sample-plugins` 下新增插件目录与描述文件。
- 插件 `plugin.json` 定义 URL、输出目录、无头模式参数。
- 插件 `plugin.json` 定义 `runtime.windows/mac` 运行与安装命令。
- 插件 `index.js` 使用 Playwright 打开页面并截图。
- 插件 `package.json` 添加 `playwright` 依赖。

## Verification
- `python3 .codex/skills/reindeer-chopper-plugin-creator/scripts/validate_plugin.py sample-plugins/playwright-screenshot`
- `node sample-plugins/playwright-screenshot/index.js --url https://example.com --outputDir /tmp --headless`（若依赖已安装）

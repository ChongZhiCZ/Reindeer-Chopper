# Playwright Screenshot Plugin Implementation

**Date:** 2026-03-12  
**Project:** Reindeer Chopper

## Summary
在 `sample-plugins` 新增 `playwright-screenshot` 示例插件。插件支持填写网站 URL、输出目录和无头模式，运行后会打开指定页面并输出 `screenshot.png`。

## Changed Files
- `sample-plugins/playwright-screenshot/plugin.json`
- `sample-plugins/playwright-screenshot/index.js`
- `sample-plugins/playwright-screenshot/package.json`
- `docs/plans/2026-03-12-playwright-screenshot-plugin-design.md`
- `docs/plans/2026-03-12-playwright-screenshot-plugin-impl.md`

## Implementation Notes
- 参数定义：
  - `url` (`text`, required)
  - `outputDir` (`filepath`, `pathMode: "directory"`, required)
  - `headless` (`boolean`)
- 运行定义：
  - `runtime.windows.run`: `node index.js`
  - `runtime.windows.install`: `cmd /C "npm install && npx playwright install chromium"`
  - `runtime.mac.run`: `node index.js`
  - `runtime.mac.install`: `sh -lc 'npm install && npx playwright install chromium'`
- 运行逻辑：
  - 校验 `--url` 和 `--outputDir`
  - 使用 `playwright` 的 `chromium.launch({ headless })` 打开页面
  - 截图保存到 `<outputDir>/screenshot.png`
  - 终端输出固定格式日志，便于追踪

## Verification
- `python3 .codex/skills/reindeer-chopper-plugin-creator/scripts/validate_plugin.py sample-plugins/playwright-screenshot` ✅
- `node --check sample-plugins/playwright-screenshot/index.js` ✅

## Residual Risks
- 未在当前环境执行完整运行冒烟（插件目录未安装 `playwright` 依赖）。首次在应用中运行该插件前需要完成依赖安装。

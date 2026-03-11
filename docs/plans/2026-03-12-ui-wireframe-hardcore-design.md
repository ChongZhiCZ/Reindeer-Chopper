# UI Wireframe Hardcore 设计说明

## 任务目标
将当前 Reindeer-Chopper 前端 UI 复刻为“设计方案二：硬核工具风 / 线框风”，以 `temp/ui.html` 为视觉参考。

## 已确认范围
- 使用四段式结构：`Topbar + Sidebar + Main + Log/Terminal`。
- 视觉统一为黑白灰，强调 1px 线框分割与栅格秩序。
- 所有可见控件取消圆角（`border-radius: 0`）。
- 按钮采用方块化、功能分区明确的硬边样式。
- 不改变插件执行、配置读写、终端交互等行为逻辑。

## 约束
- 不调整插件 descriptor 语义。
- 不修改后端命令协议。
- 保留现有终端 tab 与 resize 交互，仅做样式重塑。

## 组件层改造策略
- `App.tsx`：引入顶栏、重排主布局层级。
- `PluginSidebar`：改为浅灰底线框列表，选中项黑底白字。
- `ConfigBar`：改为连续线框控制条（label/select/action/run）。
- `PluginForm + 字段组件`：表单标签 uppercase、输入框硬边焦点加粗。
- `TaskTabBar + TerminalPanel`：tab 线框扁平化，终端区黑底并保留 task 切换。
- `index.css`：定义风格 token 与全局线框基线样式。

## 验收标准
- 页面第一眼风格与 `temp/ui.html` 一致：黑白灰、零圆角、线框秩序。
- 布局层级与交互路径不退化。
- 前端构建通过：`npm run build`。


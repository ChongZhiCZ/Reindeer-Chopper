# UI Wireframe Hardcore Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Re-skin the current frontend into the strict black/white/gray wireframe tool style from `temp/ui.html` without changing runtime behavior.

**Architecture:** Keep the existing React component tree and data flow, but replace layout wrappers and utility classes with a shared wireframe visual language driven by global CSS tokens. UI behavior (plugin select/config save/run/task terminal) remains unchanged.

**Tech Stack:** React + TypeScript + Tailwind runtime + custom CSS tokens in `src/index.css`.

---

### Task 1: 建立线框风全局 token 与基础规则

**Files:**
- Modify: `src/index.css`

1. 定义黑白灰 token（文本、边框、背景、次级背景）。
2. 清理默认圆角/阴影倾向，确保输入/按钮控件为硬边。
3. 设置基础字体、字重、字距，建立“工程图纸”感。

### Task 2: 重构主布局为四段式结构

**Files:**
- Modify: `src/App.tsx`

1. 增加顶部 `Topbar`，文字风格与参考稿一致。
2. 调整主内容为 `Sidebar + Main`。
3. 终端区域保留可拖拽高度能力，仅修改视觉分割条风格。

### Task 3: 改造 sidebar / config bar / 表单字段视觉

**Files:**
- Modify: `src/components/PluginSidebar.tsx`
- Modify: `src/components/ConfigBar.tsx`
- Modify: `src/components/PluginForm.tsx`
- Modify: `src/components/fields/FieldWrapper.tsx`
- Modify: `src/components/fields/TextField.tsx`
- Modify: `src/components/fields/NumberField.tsx`
- Modify: `src/components/fields/SelectField.tsx`
- Modify: `src/components/fields/BooleanField.tsx`
- Modify: `src/components/fields/FilePathField.tsx`

1. 所有按钮/输入/选择器转为方形硬边线框。
2. 侧栏项 hover 与选中态改为强对比。
3. 配置栏做连续边框控制带，运行按钮高对比黑底白字。
4. 字段标签大写小号，说明文字弱化灰色。

### Task 4: 改造任务标签与终端容器样式

**Files:**
- Modify: `src/components/TaskTabBar.tsx`
- Modify: `src/components/TerminalPanel.tsx`

1. Tab 条扁平线框化，不使用圆角状态点。
2. 终端容器采用黑底并保持任务切换行为。

### Task 5: 验证与交付记录

**Files:**
- Modify: `docs/plans/2026-03-12-ui-wireframe-hardcore-impl.md`

1. 运行 `npm run build`。
2. 在文档追加“执行结果 / 风格记录 / 残余风险”。


---

## 执行结果（2026-03-12）

### 已完成改动
- 主布局重构为 `Topbar + Sidebar + Main + Terminal`。
- 侧栏、配置栏、表单字段、任务标签、终端容器全部替换为线框风类名体系。
- 全局样式迁移到 `src/index.css` 的黑白灰 token，统一 0 圆角、1px 分割线、硬边交互。
- 移除运行态中的彩色强调（蓝/红/绿），状态视觉改为灰阶。

### 验证
- 运行命令：`npm run build`
- 结果：通过（TypeScript + Vite 构建成功）

## 设计风格记录（方案二：硬核工具风 / 线框风）

### 核心原则
1. 绝对秩序：所有区域通过 1px 实线切分，结构优先于装饰。
2. 零圆角：按钮、输入框、标签、容器统一 `border-radius: 0`。
3. 单色纪律：仅使用黑白灰，不引入情绪化色彩。
4. 方块控件：操作按钮全部为硬边方块，hover 仅做明暗反差。
5. 信息分级：标题粗体、标签大写、描述降灰，避免视觉噪音。

### 视觉 token
- 主色：`#000000`
- 背景：`#ffffff`
- 浅灰面：`#f0f0f0`
- 弱灰文字：`#666666`
- 边框：`#000000`

### 组件规范
- Topbar：小字号大写，底边框分隔。
- Sidebar：浅灰底，列表项逐行边框；选中态黑底白字。
- Control Bar：连续边框控制带（Label/Select/Action/Run）。
- Form Field：大写标签，输入框聚焦时边框加粗而非发光。
- Task Tabs：扁平标签，不使用圆角胶囊。
- Terminal：黑底作为执行区，保持工具属性而非装饰属性。

## 残余风险
- 目前移动端为响应式折叠实现，若后续引入更复杂侧栏功能可能需要进一步优化交互密度。
- 终端 JS 包体积告警仍存在（>500kB），与本次 UI 改造无关。

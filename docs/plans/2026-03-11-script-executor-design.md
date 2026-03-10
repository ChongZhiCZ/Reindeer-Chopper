# Script Executor Design

**Date:** 2026-03-11
**Project:** Reindeer Chopper
**Stack:** Tauri v2 + React + TypeScript + portable-pty

---

## Overview

A plugin-based script executor desktop application. Each plugin declares its parameters via a `plugin.json` descriptor; the executor renders a form from that descriptor, manages saved parameter configurations, and runs scripts in a real PTY with live terminal output. Multiple plugin instances can run concurrently, each in its own tab.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  React Frontend                  │
│  ┌──────────┐  ┌──────────────────────────────┐ │
│  │ Plugin   │  │  Main Panel                  │ │
│  │ Sidebar  │  │  ┌────────────────────────┐  │ │
│  │          │  │  │  Config Bar             │  │ │
│  │ Plugin A │  │  │  Parameter Form         │  │ │
│  │ Plugin B │  │  └────────────────────────┘  │ │
│  │ Plugin C │  │  ┌────────────────────────┐  │ │
│  │   ...    │  │  │  Task Tabs             │  │ │
│  └──────────┘  │  │  [Task1][Task2][Task3] │  │ │
│                │  ├────────────────────────┤  │ │
│                │  │  xterm.js Terminal     │  │ │
│                │  └────────────────────────┘  │ │
│                └──────────────────────────────┘ │
└─────────────────────────────────────────────────┘
           Tauri IPC (invoke / events)
┌─────────────────────────────────────────────────┐
│                  Rust Backend                    │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Plugin      │  │ Task     │  │ PTY        │  │
│  │ Scanner     │  │ Manager  │  │ Manager    │  │
│  │             │  │          │  │(portable-  │  │
│  │ reads JSON  │  │ HashMap  │  │  pty)      │  │
│  │ descriptors │  │<id,sess> │  │            │  │
│  └─────────────┘  └──────────┘  └────────────┘  │
└─────────────────────────────────────────────────┘
           ↓ spawns
┌─────────────────────────────────────────────────┐
│  Plugin Processes (Node.js in PTY)               │
│  ~/plugins/my-plugin/  node index.js --args...   │
└─────────────────────────────────────────────────┘
```

---

## Plugin System

### Directory Structure

```
~/Library/Application Support/reindeer-chopper/plugins/
├── image-resizer/
│   ├── plugin.json        ← descriptor
│   ├── package.json
│   ├── index.js           ← entry script
│   └── node_modules/      ← generated after npm install
├── csv-converter/
│   ├── plugin.json
│   ├── package.json
│   └── index.js
```

### plugin.json Schema

```json
{
  "id": "image-resizer",
  "name": "图片压缩",
  "version": "1.0.0",
  "description": "批量压缩图片到指定尺寸",
  "entry": "index.js",
  "parameters": [
    {
      "name": "inputDir",
      "label": "输入目录",
      "type": "text",
      "required": true,
      "description": "图片所在目录路径"
    },
    {
      "name": "width",
      "label": "目标宽度(px)",
      "type": "number",
      "default": 1920
    },
    {
      "name": "format",
      "label": "输出格式",
      "type": "select",
      "options": ["jpeg", "png", "webp"],
      "default": "jpeg"
    },
    {
      "name": "verbose",
      "label": "详细输出",
      "type": "boolean",
      "default": false
    }
  ]
}
```

### Supported Parameter Types (MVP)

| type | UI component | Notes |
|---|---|---|
| `text` | text input | plain string |
| `number` | number input | integer or float |
| `boolean` | checkbox / toggle | |
| `select` | dropdown | requires `options` array |
| `filepath` | text input + file picker button | calls Tauri `dialog::open()` |

### Parameter Passing

Parameters are passed as CLI args:

```
node index.js --inputDir "/path/to/images" --width 1920 --format jpeg --verbose
```

Scripts parse via `process.argv` or any args library. No constraints imposed on plugin authors.

---

## Configuration Management

Each plugin supports multiple saved named configurations (like IDE run configurations).

### Storage

```
~/Library/Application Support/reindeer-chopper/configs/
├── image-resizer.json
└── csv-converter.json
```

Per-plugin file format:

```json
[
  {
    "id": "uuid-1",
    "name": "本地测试",
    "params": {
      "inputDir": "/tmp/images",
      "width": 800,
      "format": "jpeg",
      "verbose": true
    }
  },
  {
    "id": "uuid-2",
    "name": "生产环境",
    "params": {
      "inputDir": "/data/images",
      "width": 1920,
      "format": "webp",
      "verbose": false
    }
  }
]
```

### Config Bar UI

```
┌─────────────────────────────────────────────┐
│ 配置：[本地测试 ▼]  [新建]  [保存]  [删除]    │
├─────────────────────────────────────────────┤
│ 参数表单...                                  │
│                                             │
│                          [运行此配置]         │
└─────────────────────────────────────────────┘
```

- Selecting a config auto-fills the form with saved values
- "保存" updates current config; "新建" saves as a new named config
- Same plugin can run with different configs simultaneously

---

## Execution Data Flow

```
用户选择插件
    ↓
Rust 返回 plugin.json → React 渲染表单
    ↓
用户选择/创建配置 → 填写参数 → 点击"运行"
    ↓
React invoke("run_plugin", { pluginId, configName, params })
    ↓
Rust: 检查 node_modules 是否存在？
    ├── 否 → 先在 PTY 中运行 npm install（用户可见进度）
    └── 是 → 跳过
    ↓
Rust: 创建新 PTY session，分配 taskId
    ↓
Rust: spawn `node index.js --param1 val1 ...`
    ↓
Rust: 发送 event("pty_output", { taskId, data })  ←─┐
    ↓                                               │
React: 新增 Tab(taskId) → xterm.js 渲染输出  ─────────┘
    ↓
用户在 xterm.js 输入 → invoke("pty_input", { taskId, data })
    ↓
Rust: 写入对应 PTY stdin
    ↓
进程退出 → Rust 发送 event("task_done", { taskId, exitCode })
         → React 标记 Tab 为已完成
```

**npm install** also runs in the PTY so the user sees installation progress before the script starts.

---

## Task Tabs

### Naming

Tab title format: `{插件名}-{配置名}`, e.g. `图片压缩-本地测试`

### Active vs Inactive

- **Active tab:** `flex-shrink: 0`, full name displayed
- **Inactive tabs:** `min-width` + `flex-shrink`, text `overflow: hidden; text-overflow: ellipsis`

```
┌─────────────────────┬──────────┬──────────┬──┐
│ 图片压缩-本地测试  ×  │ 图片压缩-… ×│ CSV转换-… ×│ +│
└─────────────────────┴──────────┴──────────┴──┘
```

### Kill

Clicking the `×` close button on a tab:
1. React invokes `kill_task(taskId)`
2. Rust kills the PTY process and removes the session from `HashMap`
3. React removes the tab

---

## Frontend Component Structure

```
App
├── PluginSidebar
│   ├── PluginList
│   └── PluginItem
│
└── MainPanel
    ├── ConfigBar
    │   ├── ConfigSelector (dropdown)
    │   ├── NewConfigButton
    │   ├── SaveConfigButton
    │   └── DeleteConfigButton
    │
    ├── PluginForm
    │   ├── TextField
    │   ├── NumberField
    │   ├── BooleanField
    │   ├── SelectField
    │   ├── FilePathField
    │   └── RunButton
    │
    ├── TaskTabBar
    │   └── TaskTab (name, status indicator, close button)
    │
    └── TerminalPanel
        └── xterm.js (active tab's PTY)
```

State management: React built-in `useState`/`useReducer`. No external state library needed for MVP. Each xterm `Terminal` instance is created per task; tab switching detaches/attaches to the shared DOM container.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Tauri v2 |
| Frontend | React + TypeScript |
| Terminal UI | xterm.js |
| PTY management | Rust `portable-pty` crate |
| Styling | Tailwind CSS |
| Script runtime | System Node.js (user must have installed) |

---

## Future Extension Points

- **Python support:** Add `"runtime": "node" | "python"` field to `plugin.json`; Rust selects runtime accordingly; `npm install` → `pip install -r requirements.txt`
- **Git plugin installation:** Clone repo into plugins directory; same load flow applies, no core architecture changes needed
- **File path field (MVP uses text):** `type: "filepath"` triggers Tauri `dialog::open()` system file picker

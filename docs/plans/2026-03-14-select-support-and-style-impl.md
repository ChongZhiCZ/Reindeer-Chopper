# Select Support And Style Implementation

## 实施内容
- `sample-plugins/hello-world/plugin.json`
  - 新增 `mode` 参数：`type=select`，默认 `问候`，选项为 `问候`、`自述`。
- `sample-plugins/hello-world/index.js`
  - 新增 `mode` 参数解析（`--mode`）。
  - 当 `mode=自述` 时输出插件自述信息；否则保持原问候循环逻辑。
- `src/index.css`
  - 统一 `.control-select` 与 `.field-select` 的视觉样式（自定义箭头、padding、焦点态、option 背景）。
- `src/components/WireSelect.tsx`
  - 新增自定义下拉组件（触发按钮 + 弹层 option 列表），替代原生 `<select>`，避免系统默认 option 样式。
- `src/components/ConfigBar.tsx`、`src/components/fields/SelectField.tsx`
  - 两处下拉都切换到 `WireSelect`，保证配置选择和参数选择完全同源渲染与交互。
- `src/components/fields/NumberField.tsx`
  - number 输入改为 `- / input / +` 组合结构，使用自定义按钮替代原生 spinner。
- `src/index.css`
  - 新增 `.field-number-row`、`.field-step-btn`，并关闭 number 原生上下调节按钮，保证与线框按钮风格一致。

## 验证命令
- `npm run build`
- `node sample-plugins/hello-world/index.js --name Tester --mode 自述`

## 验证结果
- `npm run build`：通过（TypeScript 与 Vite 构建成功）。
- `node sample-plugins/hello-world/index.js --name Tester --mode 自述`：通过（输出 `Selected mode: 自述` 与自述内容，脚本正常结束）。

## 残余风险
- 内置示例插件已支持 select 参数，但历史导入的旧插件若未声明 `options`，UI 仍会显示空下拉（符合现有行为）。

# HomeGuard — 智能屋抢救行动 · 项目计划书

> **版本**: v1.0 ｜ **日期**: 2026-09-03 ｜ **状态**: 待启动
> **工作目录**: `D:\greathing\AI_Project\AI_coding\WebMCP`（**硬性约束：所有开发、构建、产出只允许发生在本文件夹内，禁止读写本文件夹以外的任何目录**）

---

## 1. 项目概述

### 1.1 一句话定位

一个**智能体原生（agent-native）的模拟智能家居仪表盘**：房子会随机出故障（漏水、暖气失控、扫地机卡死……），用户可以亲手抢修，也可以召唤 ChatGPT 智能体当"物业管家"来诊断和抢修——**危险操作必须经用户确认**。

### 1.2 项目背景

- 为 OpenAI WebMCP Challenge（2026-08-25 ~ 09-03）开发，提交截止 **2026-09-03 13:00 PT（北京时间 09-04 约 04:00）**。
- WebMCP 是 W3C Web Machine Learning CG 下的实验性开放标准：网站通过 `document.modelContext`（含 `navigator.modelContext` 回退）注册结构化工具，浏览器内智能体可直接调用，无需抓取/模拟 DOM。
- 提交物要求：项目描述 + 可运行的上架应用 + 公开开源仓库 + ≤3 分钟演示视频，经 Devpost 提交。

### 1.3 愿景陈述

> 搜索引擎爬虫解决了机器"读"网页的问题，WebMCP 要解决"做"的问题。HomeGuard 用一间会坏的房子，第一次让人亲眼看见：当你的家对智能体"开口说话"，会发生什么。

---

## 2. 创意性论证（为什么这个创意能赢）

### 2.1 避开红海

调研结论（awesome-webmcp 全清单 + 官方 9 个示例）中已饱和的方向：餐厅/航班/酒店预订、电商下单、解谜游戏、网站 agent 就绪度评分、二维码/图表生成。**智能家居/IoT 场景在所有已知 WebMCP 示例中为空白。**

### 2.2 命中 WebMCP 的全部差异化卖点

| WebMCP 独有能力 | HomeGuard 中的体现 |
|---|---|
| 结构化工具 + 类型化 schema | 12–20 个设备操作工具，参数有范围校验 |
| 智能体实时感知页面状态 | 各房间湿度/温度/设备错误码持续 tick 变化，agent 用 `get_house_status` 读取而非抓 DOM |
| `readOnlyHint` / `destructiveHint` 注解 | 关总水阀、拉总电闸标注为破坏性操作 |
| 敏感操作用户确认 | 破坏性工具调用弹出确认框——"厨房漏水时是否拉总电闸（冰箱会断电）"，有真实权衡 |
| 人机同页协作 | 人类能点按钮抢修，agent 能并行监控全部设备——"各自擅长的事不同" |

### 2.3 评审心理学

- 评委是 OpenAI 与 Chrome 团队：视频结尾一句"**今天你真实的家做不到这一点，你的管家智能体看不见你家的状态**"，把 demo 升华为对标准的呼吁，正中主办方叙事。
- HN 上的主要批评是"有价值的网站要么有 API 要么不愿开放"——HomeGuard 的状态（实时传感器、故障事件）**天然不存在 API**，正面回应了这一质疑。
- 戏剧性：漏水倒计时 + 确认弹窗特写 = 3 分钟视频天然的高潮结构。

---

## 3. 需求定义

### 3.1 功能需求（MVP，P0）

- **F1 仪表盘**：单页 UI，展示全屋设备状态（在线/离线/故障）、关键传感器读数（温度、湿度、水位）、事件日志流。
- **F2 房屋模拟引擎**：内存中的 tick 循环（1 tick = 1 秒），驱动设备状态变化与"厨房漏水"主剧情线（水位随时间上涨 → 损失分数累积）。
- **F3 人工操作界面**：每个设备可点击开关/调节；破坏性手动操作同样弹确认框（人机规则一致）。
- **F4 WebMCP 工具注册**（核心，⚠️ 实施修正：当前草案 annotations 仅支持 `readOnlyHint`/`untrustedContentHint`，无 `destructiveHint`——破坏性提示写入工具 `title`/`description`，并一律走可见 UI 确认）：
  | 工具名 | 注解 | 功能 |
  |---|---|---|
  | `get_house_status` | `readOnlyHint` | 全屋设备状态 + 传感器读数 + 活跃故障 |
  | `get_device_log` | `readOnlyHint` | 单设备事件历史（诊断线索藏在日志里） |
  | `toggle_device` | — | 开关灯/插座/扫地机 |
  | `set_thermostat` | — | 设定温度（16–30°C 范围校验） |
  | `shut_off_main_valve` | `destructiveHint` | 关总水阀（止水，需用户确认） |
  | `kill_main_breaker` | `destructiveHint` | 拉总电闸（止漏电风险，冰箱断电扣分，需用户确认） |
- **F5 确认流程**：破坏性工具调用 → 页面弹出确认卡片（写明后果）→ 用户批准/拒绝 → 结果回传智能体。
- **F6 结算界面**：通关后显示损失分数 + "智能体操作复盘时间线"（每次工具调用、参数、结果、耗时）。

### 3.2 功能需求（完整版，P1，时间允许再做）

- F7 更多设备：智能门锁（`unlock_door`，破坏性）、烟雾报警器、窗帘。
- F8 第二/第三剧情线（暖气失控、扫地机卡死），故障随机化。
- F9 倒计时 + 损失分数游戏机制、星级评价。
- F10 `/learn` 页面：展示"智能体视角"——它注册了哪些工具、收到什么 JSON。

### 3.3 非功能需求

- **N1 性能**：首屏 < 2s（静态托管，无后端）。
- **N2 兼容**：ChatGPT 内置浏览器原生可用；Chrome（开 flag）可用；普通浏览器经 polyfill 可浏览但不注册工具。
- **N3 无后端**：全部状态在一个内存 store，纯前端，可部署到任意静态托管。
- **N4 开源**：仓库公开，MIT License。
- **N5 可访问性**：确认卡片文字清晰无行话（视频里会被特写）。

### 3.4 成功标准（DoD）

1. 在 Chrome（flag 开启）中，`navigator.modelContext` 成功注册全部 6 个 P0 工具，Inspector 扩展可见。
2. 一条完整剧情可被演示：漏水发生 → 智能体读状态 → 读日志定位 → 调用破坏性工具 → 用户确认 → 房屋恢复 → 结算页呈现复盘时间线。
3. 无工具调用导致的页面报错；schema 校验拒绝越界参数。
4. 仓库公开 + MIT + README 含复现步骤；3 分钟视频脚本就绪。

---

## 4. 技术方案

### 4.1 技术选型

| 层 | 选型 | 理由 |
|---|---|---|
| 构建 | Vite 5 + React 18 + TypeScript | 启动快、HMR 快，符合短周期 |
| 状态 | Zustand 单 store | 极简，游戏循环和工具共享同一份真相 |
| 样式 | Tailwind CSS（CDN 或构建集成，二选一按时间） | 仪表盘布局快速成型 |
| WebMCP | `document.modelContext` 优先，`navigator.modelContext` 回退，`@mcp-b/webmcp-polyfill` 兜底 | 对齐标准草案 + 社区兼容层 |
| Schema | 手写 JSON Schema（不引 Zod 以省体积） | 6 个工具手写更直接 |
| 部署 | Cloudflare Pages 或 Netlify | 免费、有 WebMCP 合作伙伴光环 |

### 4.2 架构

```
src/
├── main.tsx            # 入口
├── App.tsx             # 仪表盘布局
├── sim/
│   ├── house.ts        # 设备/房间数据模型 + 初始状态
│   ├── engine.ts       # tick 循环：水位上涨、故障触发、损失计分
│   └── scenarios.ts    # 剧情线定义（P0 仅 kitchen_leak）
├── mcp/
│   ├── tools.ts        # 6 个工具的 schema + handler（读写 store）
│   └── register.ts     # 特性检测 + 注册 + polyfill 兜底 + 注解
├── ui/
│   ├── Dashboard.tsx   # 房间卡片、设备开关
│   ├── ConfirmCard.tsx # 破坏性操作确认弹窗（人机共用）
│   ├── EventLog.tsx    # 事件日志流
│   └── Debrief.tsx     # 结算 + 智能体操作复盘时间线
└── store.ts            # Zustand：状态 + action（工具与 UI 调同一 action）
```

关键设计决策：

- **工具 handler 与 UI 按钮调用同一批 store action**——保证"人做的"和"智能体做的"产生完全一致的状态迁移与日志，复盘时间线里 `actor` 字段标记来源（`human` | `agent`）。
- **确认队列**：破坏性工具 handler 不直接执行，而是把待确认操作压入 store 队列并返回"等待用户确认"给智能体；用户批准后执行并写入日志。这是全片演示的灵魂，必须做成独立模块。
- **游戏引擎即纯函数**：`engine.tick(state, dt)` 纯函数化，便于单测水位增长和分数逻辑。

### 4.3 工具注册示例（目标形态，已按草案修正）

```ts
document.modelContext.registerTool({
  name: 'shut_off_main_valve',
  title: '关闭总水阀（危险操作）',
  // 破坏性提示写入 description（草案无 destructiveHint 注解）
  description: '【破坏性操作，需要用户在页面上确认】关闭全屋主水阀，立即止住厨房漏水。副作用：全屋停水。',
  inputSchema: { type: 'object', properties: {}, required: [] },
  execute: async (_input, { signal }) => store.requestConfirmation('shut_off_main_valve'),
});
```

### 4.4 实施期发现（M1 实测结论）

- **Origin-Agent-Cluster 必需**：WebMCP 要求页面运行在 origin agent cluster，否则 `registerTool()` 抛 `SecurityError`。已在 `vite.config.ts`（server/preview）与 `public/_headers`（Netlify/Cloudflare）配置 `Origin-Agent-Cluster: ?1`。
- **嵌入式 webview 兼容**：IDE 内置浏览器等不实现 OAC 的环境，polyfill 分支声明 `originAgentCluster` 后继续（原生 Chrome 路径不受影响）。
- **计分平衡**：损失分 0.5/ cm/s、排水 1.2 cm/s、星级阈值 <150/<400（实测 27 秒金牌、37 秒二星）。

---

## 5. 里程碑与任务拆解

> 今日开工即进入 Sprint 0（抢提交）。若错过本次截止，M1/M2 顺序不变，作为独立开源项目继续。

### M1 · 可提交 MVP（约 4–6 小时，P0）

| # | 任务 | 预估 |
|---|---|---|
| 1 | Vite + React + TS 脚手架（在本目录） | 20 min |
| 2 | `sim/`：房屋数据模型 + tick 引擎 + kitchen_leak 剧情线 | 60 min |
| 3 | `ui/`：仪表盘 + 设备开关 + 事件日志 | 60 min |
| 4 | `mcp/`：6 工具注册 + 确认队列 + ConfirmCard | 60 min |
| 5 | 结算页 + 复盘时间线（简版） | 30 min |
| 6 | Chrome flag 下实测注册与调用（browser-use + Inspector 扩展） | 40 min |
| 7 | 部署静态托管 + README + MIT | 30 min |

### M2 · 完整版（提交后继续）

更多设备与剧情线、倒计时计分、`/learn` 智能体视角页、操作复盘增强、移动端适配。

### M3 · 提交材料

Devpost 表单文案（项目描述）、3 分钟视频（脚本：故障戏剧画面 → 手忙脚乱 → 智能体诊断 → 确认弹窗特写 → 结算复盘 → 升华呼吁）。

---

## 6. 测试与验证计划

1. **单测**：engine tick 的水位/分数纯函数（Vitest）。
2. **工具注册验证**：Chrome 开 `chrome://flags/#enable-webmcp-testing`，用 Model Context Tool Inspector 扩展确认 6 工具可见、描述完整。
3. **端到端 GUI 测试**：browser-use 驱动浏览器——手动按钮路径 + （若 ChatGPT 环境不可达）模拟智能体调用 `execute` 路径，验证确认队列阻塞与放行。
4. **schema 边界**：`set_thermostat(50)` 应被拒绝；`toggle_device('不存在的设备')` 返回可读错误。
5. **兜底路径**：普通无 WebMCP 浏览器打开，页面功能完整、控制台无注册报错。

---

## 7. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| ChatGPT 内置浏览器无法在本地自动化验证 | 无法端到端确认智能体真调工具 | ① Inspector 扩展手动调用工具验证 handler；② browser-use 在 Chrome flag 环境验证注册链路；③ 视频用 ChatGPT 手动实录 |
| 截止时间（今日 13:00 PT）不够 | 错过本届 | M1 完成即最大化冲刺；错过后转独立开源项目发布，仍具价值 |
| `document.modelContext` 草案 API 变动 | 注册代码失效 | 已内置 `navigator.modelContext` 回退 + polyfill 兜底，特性检测三分支 |
| 破坏性确认弹窗被智能体环境吞掉 | 灵魂功能失效 | 确认队列返回明确的 pending 状态文本给智能体，UI 同时置顶卡片，双通道保证可见 |
| 评分细则未完全掌握 | 做功偏移 | 已按官方示例共性（实时状态、确认、人机协作）对齐；提交前对照 Devpost 规则页最终核对 |

---

## 8. 硬性约束

1. **工作目录锁定**：所有源码、构建产物、文档、脚本仅存在于 `D:\greathing\AI_Project\AI_coding\WebMCP`；禁止在此目录之外创建、修改或读取项目文件。
2. 已装 skills（`skills/webmcp/`、`skills/webmcpify/`）为本次开发的实现与调试参考，动手前先读 SKILL.md。
3. 代码与文档语言：代码注释/标识符英文，面向用户的 UI 文案与提交材料中文为主（视频需英文字幕）。

---

## 9. 提交前核对清单

- [ ] Live app 已部署且可公开访问
- [ ] 公开仓库 + MIT License + README（含"如何让 ChatGPT 看见工具"复现步骤）
- [ ] 项目描述（Devpost 表单）写完
- [ ] ≤3 分钟演示视频录制并上传
- [ ] 对照 Devpost 官方规则页逐条核对

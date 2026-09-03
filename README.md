# 🏠 HomeGuard — 智能屋抢救行动

一个**智能体原生（agent-native）**的智能家居**应急处置训练模拟器**，基于开放标准 [WebMCP](https://github.com/webmachinelearning/webmcp)（`document.modelContext`）构建。

> **Live Demo**: _（部署后填写）_ ｜ **Demo Video**: _（录制后填写）_ ｜ **License**: MIT

## 这解决什么真实问题

复杂智能家居的面板和故障日志让应急处置成本很高：普通用户不知道先关阀还是先断电，也说不清危险操作的副作用。HomeGuard 用一间会"出事"的模拟房子验证一个新交互范式：

- **智能体负责诊断和建议**：通过页面注册的结构化工具读取实时设备状态、翻查故障日志、定位原因——而不是抓取 DOM 或模拟点击。
- **人类批准高影响操作**：关总水阀、拉总电闸这类不可逆动作，智能体必须请求、用户必须确认，决定权始终在人。
- **边界诚实**：本演示使用本地模拟状态，不连接真实住宅设备；它展示的是智能体与设备页面应有的协作协议。

## 场景：厨房漏水应急演习

你家的厨房供水管即将爆裂。8 秒后水浸传感器报警，积水随时间上涨、损失分数持续累积。你可以亲自抢修，也可以召唤 ChatGPT 智能体当"物业管家"：它读状态、查日志、定位爆管，并在执行危险操作前请求你的确认。演习结束后，结算页给出损失评分和**智能体操作复盘时间线**（每一次工具调用、参数与结果）。

## 注册的 WebMCP 工具

| 工具 | 注解 | 说明 |
|---|---|---|
| `get_house_status` | `readOnlyHint` | 全屋房间传感器 + 设备状态 + 活跃故障 + 损失分数 |
| `get_device_log` | `readOnlyHint` | 指定设备的事件日志（诊断线索在这里） |
| `set_device_power` | — | 设置设备电源状态，**幂等**（重复设置同一状态无副作用） |
| `set_thermostat` | — | 设定目标温度（16–30°C，越界返回纠正性错误） |
| `shut_off_main_valve` | 危险 | 关总水阀止水，需用户在页面上确认 |
| `kill_main_breaker` | 危险 | 拉总电闸，市电设备全部断电、冰箱罚 +120 分，需用户确认 |

破坏性提示写入工具 `title`/`description`（当前草案的 `annotations` 仅支持 `readOnlyHint`/`untrustedContentHint`）；所有危险操作在 store 层强制走可见确认卡片，并支持智能体取消信号。

## 阶段门卫（防绕过）

- `idle`（未开始）：只读工具可用，一切变更类工具返回"演习尚未开始"纠正性错误；
- `active`（演习中）：全部工具可用；
- `resolved`（已结束）：只允许复盘查看。

校验在共享 store action 里实现（智能体不经过 UI 按钮，store 是最终边界）；UI 同步禁用不可用按钮。

## 🚀 快速开始

```bash
npm install
npm run dev        # 开发模式 http://localhost:5173
npm test           # Vitest 行为测试（14 用例）
npm run build      # 产出 dist/
npm run preview    # 预览生产构建
```

### 让智能体"看见"本页工具

- **ChatGPT 应用内浏览器**：原生支持 WebMCP，直接打开部署后的 URL 即可。
- **Chrome 预览版**：在 `chrome://flags/#enable-webmcp-testing` 开启实验标志后访问。
- **其他浏览器**：自动启用 `@mcp-b/webmcp-polyfill` 演示模式。

### polyfill 能验证什么、不能验证什么

- ✅ 能：工具注册流程、Schema 形状、handler 行为与返回值、确认卡片流程（页面内）。
- ❌ 不能：页面外真实智能体的发现与调用、原生取消信号传播（polyfill 不传执行参数，本项目已做缺省兼容）、跨 frame 工具可见性。
- 页面内的测试手柄：`window.__homeguard.executeTool('get_house_status', {})`（辅助手段，行为与真实调用一致）。

## 🏗 架构

```
src/
├── sim/        # 房屋数据模型 + tick 游戏引擎（纯函数）
├── store.ts    # Zustand 单 store：UI 与工具共用同一批 action；阶段/断电约束的最终边界
├── mcp/
│   ├── tools.ts     # 6 个工具定义 + 破坏性守卫 + 确认队列 Promise 桥
│   └── register.ts  # 三级回退注册（document → navigator → polyfill）+ 生命周期 cleanup
└── ui/         # 仪表盘 / 确认卡片 / 事件日志 / 结算复盘
tests/          # Vitest 最小行为测试集
```

关键设计：

- **人机同路径**：工具 handler 与 UI 按钮调用同一批 store action，复盘时间线用 `actor` 字段区分来源。
- **确认队列**：破坏性工具的 `execute` 返回由页面确认卡片 resolve 的 Promise；监听智能体取消信号（`signal`），取消时清除卡片。
- **注册生命周期**：`setupWebMcp()` 返回可清理 handle；部分注册失败即回滚整批；StrictMode 双挂载不会重复注册。
- **原子状态**：拉总电闸一次性关闭所有市电设备并计一次罚分，工具返回时 UI 已一致。

## ☁️ 部署注意

WebMCP 要求页面运行在 **origin agent cluster** 中，否则 `registerTool()` 抛 `SecurityError`。仓库已配置：

- `public/_headers`（Netlify / Cloudflare Pages）：`Origin-Agent-Cluster: ?1`
- `vercel.json`（Vercel）：同上响应头
- 自建服务器请务必携带该响应头。

## 📄 License

MIT

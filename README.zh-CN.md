# HomeGuard — 智能屋抢救行动

[English](README.md)

一间会"出事"的模拟智能家居。**HomeGuard** 建立在开放标准 [WebMCP](https://github.com/webmachinelearning/webmcp)（`document.modelContext`）之上：当厨房水管爆裂，ChatGPT 智能体通过页面注册的结构化工具诊断故障——而每一个危险操作（关总水阀、拉总电闸）都会挂起，直到你在可见的确认卡片上亲自批准。

> **在线演示**: _待填_ · **演示视频**: _待填_ · **许可证**: MIT

## 为什么做这个

水管爆裂时，普通用户面对一堆设备面板和天书日志，要在高压下做出不可逆的决定（关阀？断电？）。DOM 抓取无法表达设备语义、危险副作用和确认边界。WebMCP 让页面自己声明能力，智能体得以像专业物业一样"诊断"，而页面负责守住交互规则：

- **智能体负责诊断和建议**——通过带类型的工具读取实时传感器与设备日志，而非抓取 DOM；
- **人类批准不可逆操作**——破坏性工具在调用中途挂起，直到用户决定；拒绝会向智能体返回得体的提示；
- **边界诚实**——这是本地模拟，展示的是协议本身，不连接真实住宅。

## 注册的六个工具

| 工具 | 注解 | 用途 |
|---|---|---|
| `get_house_status` | `readOnlyHint` | 房间传感器、设备状态、活跃故障、损失分 |
| `get_device_log` | `readOnlyHint` | 单设备事件日志——诊断线索在这里 |
| `set_device_power` | — | 设置设备电源状态，**契约级幂等** |
| `set_thermostat` | — | 设定目标温度（16–30°C，越界返回纠正性错误） |
| `shut_off_main_valve` | 破坏性* | 止水；需用户确认 |
| `kill_main_breaker` | 破坏性* | 全屋断电；冰箱罚 +120 分；需用户确认 |

\* 当前草案的 `annotations` 仅支持 `readOnlyHint` / `untrustedContentHint`，破坏性语义写入工具 `title`/`description`，并由可见确认流程强制执行。

## 安全模型

- **确认队列**：破坏性工具的 `execute()` 返回由页面确认卡片 resolve 的 Promise；智能体取消信号会同步清除卡片。
- **阶段门卫**（在 store 层强制——智能体不经过按钮，store 才是最终边界）：`idle` 拒绝一切变更、`active` 全部可用、`resolved` 只读复盘。
- **原子状态**：拉总电闸在同一次更新中关闭所有市电设备并只计一次冰箱罚分，工具返回时 UI 已一致。
- **人机同路径**：UI 按钮与工具 handler 调用同一批 store action；复盘时间线用 `actor` 标记每次操作来源。

## 快速开始

```bash
npm install
npm run dev        # 开发服务器 http://localhost:5173
npm test           # Vitest 行为测试（14 条）
npm run build      # 生产构建到 dist/
npm run preview    # 预览生产构建
```

### 让智能体"看见"工具

- **ChatGPT 应用内浏览器**：原生支持 WebMCP，直接打开部署地址。
- **Chrome 预览版**：开启 `chrome://flags/#enable-webmcp-testing`。
- **其他浏览器**：自动回退到 `@mcp-b/webmcp-polyfill` 演示模式。polyfill 能验证页内流程（注册、Schema、handler、确认卡片），但不能验证页面外智能体的发现与原生取消传播。
- 页内测试手柄：`window.__homeguard.executeTool('get_house_status', {})`。

### 多语言

界面支持中文 / English 切换（页头按钮），选择持久化到 `localStorage`，默认跟随浏览器语言。agent 契约层（工具描述、Schema、返回值、store 消息、设备日志）固定为英文：工具路由需要语言稳定，界面语言只是呈现层关注点。

## 架构

```
src/
├── i18n/        # 字符串词典、locale store、t()/tMsg() 助手
├── sim/         # 房屋数据模型 + tick 游戏引擎（纯函数）
├── store.ts     # 单一 Zustand store——UI 与工具共用同一批 action
├── mcp/
│   ├── tools.ts     # 工具定义、破坏性守卫、确认队列桥
│   └── register.ts  # document → navigator → polyfill 三级回退 + 生命周期清理
└── ui/          # 仪表盘、确认卡片、事件日志、开始海报、结算报表
tests/           # Vitest 行为测试
docs/            # 设计方案、阶段审查、提交材料
```

## 部署注意

WebMCP 要求页面运行在 **origin agent cluster** 中，否则 `registerTool()` 抛 `SecurityError`。仓库在三处配置了该响应头：

- `public/_headers` —— Netlify / Cloudflare Pages
- `vercel.json` —— Vercel
- `vite.config.ts` —— 本地 dev / preview 服务器

自建服务器请确保返回 `Origin-Agent-Cluster: ?1`。

## 文档

- [docs/plan.md](docs/plan.md) — 产品/工程计划书
- [docs/phase1.md](docs/phase1.md) — 提交前审查与修复
- [docs/SUBMISSION.md](docs/SUBMISSION.md) — Devpost 文案与 3 分钟视频脚本

## 许可证

[MIT](LICENSE)

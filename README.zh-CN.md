# HomeGuard — 智能屋抢救行动

[English](README.md)

一间会"出事"的模拟智能家居。**HomeGuard** 建立在开放标准 [WebMCP](https://github.com/webmachinelearning/webmcp)（`document.modelContext`）之上：当厨房水管爆裂，ChatGPT 智能体通过页面注册的结构化工具诊断故障——而每一个危险操作（关总水阀、拉总电闸）都会挂起，直到你在可见的确认卡片上亲自批准。

> **在线演示**: <https://katrinagui.github.io/HomeGuard/> · **演示视频**: _待填_ · **许可证**: MIT

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

## 两个场景，一套工具

每次演习随机抽取一个家庭故障：

- **厨房爆管**——积水上涨，关总水阀（破坏性，需确认）；
- **暖气失控**——温控器继电器触点粘死、室温攀升，用**同一个通用工具** `set_device_power` 关掉温控器即可。

不为剧本加工具：工具集建模的是"家"本身，而不是某个剧情——这正是 WebMCP 想要的可组合性。

### 实况 3D 玩偶屋

仪表盘的核心是一座实时 **three.js 玩偶屋**，与模拟状态逐帧同步：拖拽旋转、滚轮缩放。爆管时半透明水面沿厨房地板上涨、伴随水滴粒子与红色警灯脉冲；暖气失控时暖气片发光、热浪粒子升腾、房间逐渐染暖。每台设备头顶都有跟随实时状态的浮动指示点，房间标签从三维空间投影到屏幕。

### 智能体视角（#learn）

打开 **`/#learn`**（开始海报与仪表盘页脚也有入口），像智能体一样看本页：六件注册工具的描述与只读注解，以及 `get_house_status` 的实时 JSON。开始海报上还有一键**复制开场指令**，粘贴给 ChatGPT 即可开演。

## 安全模型

- **确认队列**：破坏性工具的 `execute()` 返回由页面确认卡片 resolve 的 Promise；智能体取消信号会同步清除卡片。另有**独立的 20 秒超时**（卡片上显示 requestId），保证调用方通道死掉后卡片绝不会一直可操作。
- **参数严格校验**：handler 绝不强转——`on` 必须是真 boolean、`targetC` 必须是真 number，否则返回纠正性错误且不改变任何状态（当前 WebMCP 运行时不会替页面校验 JSON Schema）。
- **阶段门卫**（在 store 层强制——智能体不经过按钮，store 才是最终边界）：`idle` 拒绝一切变更、`active` 全部可用、`resolved` 只读复盘。
- **原子状态**：拉总电闸在同一次更新中关闭所有市电设备并只计一次冰箱罚分，工具返回时 UI 已一致。
- **人机同路径**：UI 按钮与工具 handler 调用同一批 store action；复盘时间线用 `actor` 标记每次操作来源。

## 快速开始

```bash
npm install
npm run dev        # 开发服务器 http://localhost:5173
npm test           # Vitest 行为测试（24 条）
npm run build      # 生产构建到 dist/
npm run preview    # 预览生产构建
```

> **注意**：应用必须通过 HTTP 访问——直接双击打开 `index.html`（file:// 协议）无法加载 ES module，只会看到一页静态提示。

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
├── sim/         # 房屋数据模型 + tick 引擎（两个场景，纯函数）
├── store.ts     # 单一 Zustand store——UI 与工具共用同一批 action
├── mcp/
│   ├── tools.ts     # 工具定义、破坏性守卫、确认队列桥
│   └── register.ts  # document → navigator → polyfill 三级回退 + 生命周期清理
└── ui/          # 仪表盘、3D 玩偶屋（three.js）、确认卡片、事件日志、
                 # 开始海报、结算报表、#learn
tests/           # Vitest 行为测试
```

## 部署注意

WebMCP 要求页面运行在 **origin agent cluster** 中，否则 `registerTool()` 抛 `SecurityError`。仓库在三处配置了该响应头：

- `public/_headers` —— Netlify / Cloudflare Pages
- `vercel.json` —— Vercel
- `vite.config.ts` —— 本地 dev / preview 服务器

自建服务器请确保返回 `Origin-Agent-Cluster: ?1`。

GitHub Pages 部署（即上面的在线演示）无法自定义响应头，能否原生连接取决于浏览器——ChatGPT 应用内浏览器会直接原生连接，其余环境自动回退 polyfill 演示模式。要保证在所有浏览器都走原生路径，请部署在支持自定义响应头的平台（Netlify/Cloudflare/Vercel）。重新部署 Pages：

```bash
npm run deploy:pages     # 以 --base=/HomeGuard/ 构建并推送 dist/ 到 gh-pages 分支
```

## 许可证

[MIT](LICENSE)

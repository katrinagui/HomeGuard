# WebMCP 项目工作目录 — HomeGuard

**HomeGuard**（英文全称 *HomeGuard — An Agent-Native Smart-Home Emergency Drill*）是一个基于 WebMCP（`document.modelContext` / `navigator.modelContext`）的智能体原生智能家居应急演习模拟器。当前状态：MVP 完成 + Phase 1 修复完成，双语 UI（中/英）已上线。

## 仓库结构

- `src/` — 应用源码（`i18n/` 双语词典与 locale store；`sim/` 引擎；`mcp/` 工具注册；`ui/` 组件）
- `tests/` — Vitest 行为测试（`npm test`，14 条）
- `docs/` — `plan.md`（计划书）、`phase1.md`（审查与修复）、`SUBMISSION.md`（Devpost 文案与视频脚本）
- `skills/` — 已安装的 agent skills（`webmcp` 实现与调试参考、`webmcpify` 改造工作流），开发 WebMCP 相关代码前先读对应 SKILL.md
- `public/_headers`、`vercel.json`、`vite.config.ts` — `Origin-Agent-Cluster: ?1` 响应头（WebMCP 必需）
- 根目录 `README.md`（英文）/ `README.zh-CN.md`（中文）

## 关键设计约定

- **人机同路径**：UI 按钮与工具 handler 调用同一批 store action；`actor` 字段区分来源。
- **参数严格校验**：工具 handler 禁止 `Boolean()`/`Number()` 强转（WebMCP 运行时不替页面校验 Schema）；参数缺失或类型错误立即抛纠正性错误、不改状态。确认卡片带 requestId 与 30 秒独立超时，过期后工具抛错而非伪造"用户拒绝"。
- **语言分层**：agent 契约（工具描述/Schema/返回/store 消息/设备日志）为英文；UI 文案经 `src/i18n` 双语切换；事件数据携带 `Msg`（key + params）在渲染时本地化。
- **阶段门卫与断电原子性**在 store 层强制，改动前先读 `tests/behavior.test.ts` 了解不变量。

## 环境要点

- WebMCP 在 ChatGPT 应用内浏览器中原生可用；Chrome 需开启 `chrome://flags/#enable-webmcp-testing`。
- 非 WebMCP 浏览器回退到 `@mcp-b/webmcp-polyfill`（注意：它不传执行参数、`executeTool` 需完整 RegisteredTool 对象——详见 `skills/webmcp/references/compatibility.md`）。
- 提交物要求（OpenAI WebMCP Challenge）：项目描述 + 可运行的上架应用 + 公开开源仓库 + ≤3 分钟演示视频。

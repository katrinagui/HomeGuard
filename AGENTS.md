# WebMCP 项目工作目录

本项目目标是开发一个 WebMCP（`document.modelContext` / `navigator.modelContext`）智能体原生 Web 应用，构思方案见对话记录或 README（待创建）。

## 已安装的 agent skills（位于 `skills/`）

1. **`skills/webmcpify/`** — 端到端把 Web 应用改造成 agent-ready：盘点应用 → 提出工具清单（需人工批准）→ 集成 → 真实浏览器验证 → 自愈修复。用法："webmcpify"、"add WebMCP"。
2. **`skills/webmcp/`** — WebMCP 集成的实现与调试参考：命令式工具注册（`registerTool`）、声明式 HTML 表单标注、agent 触发的表单流程、Chrome 预览版行为验证与故障排查。含 API 参考、兼容性说明和目标定位脚本（`scripts/find-webmcp-targets.mjs`）。

开发任何 WebMCP 集成代码前，先读取对应的 SKILL.md。

## 环境要点

- WebMCP 在 ChatGPT 应用内浏览器中原生可用；Chrome 需开启 `chrome://flags/#enable-webmcp-testing`。
- 非 WebMCP 浏览器可用 `@mcp-b/webmcp-polyfill` 兜底。
- 提交物要求（OpenAI WebMCP Challenge，截止 2026-09-03 13:00 PT）：项目描述 + 可运行的上架应用 + 公开开源仓库 + ≤3 分钟演示视频。

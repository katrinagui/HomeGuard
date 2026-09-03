# 提交材料（Devpost）

> 本文件与实现同步维护，避免提交表单与代码漂移。
> 提交入口：https://webmcp.devpost.com/ ｜ 截止：2026-09-03 13:00 PT

## 一、Devpost 项目说明（直接粘贴）

### 项目名

HomeGuard — 智能屋抢救行动（An agent-native smart-home emergency drill）

### 一句话简介

An agent-native smart-home emergency drill: an AI butler diagnoses a burst pipe through WebMCP tools while every destructive action still requires the human's explicit approval.

### 详细介绍

**The problem.** Smart homes fail in moments that panic people. When a pipe bursts, a homeowner faces a wall of device panels and cryptic logs and must make irreversible decisions — shut the water valve? cut the power? — under time pressure, with visible side effects (a fridge full of food) and no way to delegate the diagnosis safely.

**Why WebMCP.** DOM scraping cannot express device semantics, dangerous side effects, or confirmation boundaries. WebMCP lets the page itself declare structured tools — `get_house_status`, `get_device_log`, `shut_off_main_valve`, `kill_main_breaker` — with typed schemas and read-only hints, so an in-browser agent can *diagnose* like a professional property manager while the page enforces the rules of engagement.

**The human stays in charge.** HomeGuard's core interaction is a confirmation contract: destructive tools suspend mid-call and resolve only when the user approves or rejects on a visible card. Rejecting returns a respectful message to the agent; the debrief timeline shows every tool call, its arguments, and its outcome — actor-tagged, so you can compare how the human and the agent each handled the same emergency.

**What we built.** A pure-frontend simulation (React + Zustand) with a tick-based house engine, six registered tools, a phase gate that prevents bypassing the drill, idempotent device controls, atomic breaker semantics, and a star-rated debrief. Fourteen behavior tests cover the paths most likely to break a demo.

**Honest boundaries.** Local simulation only — no real home devices. HomeGuard is a training ground and protocol demonstrator for smart-home vendors, property services, and households: it shows how an agent should read live device state, propose actions, and hand irreversible decisions back to humans.

### 四项评审维度的自述

- **WebMCP Leverage**：页面状态实时变化（水位/湿度/故障），智能体必须用结构化工具而非 DOM 获取；`readOnlyHint` 注解、幂等工具、破坏性确认与取消信号全部按草案实现。
- **Execution**：14 条行为测试、StrictMode 双挂载验证、原生/polyfill 双环境 E2E、原子状态更新、阶段门卫防绕过。
- **Potential Impact**：智能家居厂商与物业服务的应急训练模拟器；展示了"智能体诊断 + 人类批准"的可复制协议。
- **Creativity & Ambition**：已知 WebMCP 示例集中于预订/电商/游戏，HomeGuard 是第一个智能家居应急场景，并用复盘时间线把"工具调用"变成可回放的教学素材。

## 二、3 分钟演示视频脚本

> 要求：<3 分钟、有音频、公开放 YouTube（Devpost 表单填链接）。必须展示真实工具调用。

| 时间 | 画面 | 口播 |
|---|---|---|
| 0:00–0:20 | 仪表盘全景 → 点击"开始演习" | "This is HomeGuard — a smart home that breaks on purpose. In 8 seconds, a pipe bursts." |
| 0:20–0:40 | 警报横幅 + 水位上涨 + 损失分数跳动 | "Water is rising, damage is accruing. I could fix it myself — but my home can *talk* to my AI butler now." |
| 0:40–1:10 | ChatGPT 内置浏览器：让智能体查看家里情况 | "I ask ChatGPT what's wrong. It doesn't scrape the screen — it calls get_house_status, then reads the valve's log: pressure warnings, then a burst." |
| 1:10–1:40 | 智能体请求关阀 → 确认卡片特写（含"来源：ChatGPT 智能体"） | "It wants to shut the main valve — a destructive action. The page suspends the tool call until I decide. This is the trust boundary, built into the web standard." |
| 1:40–2:05 | 批准 → 水位回落 → 结算页：星级 + 复盘时间线滚动 | "I approve. The leak stops, water drains, and the debrief shows every tool call the agent made — arguments, outcomes, timestamps." |
| 2:05–2:30 | 再玩一次：故意拉总电闸 → 冰箱罚分展示 | "Cut power instead, and you spoil the food — every tool call has real trade-offs." |
| 2:30–2:55 | 黑屏字卡：升华句 | "Today, your real home can't do this — your butler agent can't even see your house. WebMCP changes that. HomeGuard shows what agent-native homes look like." |

录制备注：
1. 用 ChatGPT 内置浏览器实录智能体真实调用（不要只用调试手柄）。
2. 确认卡片特写是全片高潮，给足 3–4 秒。
3. 结算页复盘时间线需滚动展示完整四步链路。
4. 英文字幕。

## 三、提交前检查清单（Phase 1 §9 对应）

- [ ] Git 仓库初始化并推送到 GitHub 公开仓库（命令见下）
- [ ] 部署 Live URL（Netlify/Cloudflare/Vercel 任一，`_headers`/`vercel.json` 已就绪）
- [ ] 无登录状态验证 Live URL 返回 200 且带 `Origin-Agent-Cluster: ?1`
- [ ] 全新环境 `npm install && npm run build` 复现成功
- [ ] 在 ChatGPT 内置浏览器录制真实工具调用视频并上传 YouTube
- [ ] README 顶部填入 Live Demo / Video 链接
- [ ] Devpost 表单粘贴上方文案

### 公开仓库操作步骤（需你在 GitHub 上操作）

```bash
cd D:\greathing\AI_Project\AI_coding\WebMCP
git remote add origin git@github.com:<你的用户名>/homeguard-webmcp.git
git push -u origin main
```

然后在仓库 About 填写描述与 Live URL，Topics 建议：`webmcp` `ai-agents` `chatgpt` `smart-home` `react`。

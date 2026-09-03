# Phase 1：复测报告与收尾方案

> 复测日期：2026-09-03
> 项目：HomeGuard — 智能屋抢救行动
> 测试对象：当前 `master` 分支工作区、Vite production preview、ChatGPT 内置浏览器
> 阶段结论：核心演示链已基本可用，但目前仍不应标记为“提交就绪”。存在 1 个已复现的工具契约缺陷，危险操作的超时回收还需补强，公开提交物尚未闭环。

## 1. 结论摘要

这次复测确认，上一轮指出的主要状态问题已经修复：演习阶段门卫生效、设备开关具备幂等语义、总电闸会原子关闭市电设备并只计一次冰箱损失、React 注册流程已有清理逻辑，自动化测试和生产构建也都通过。

但真实 WebMCP 调用暴露了一个测试套件没有覆盖的问题：当前内置浏览器不会替页面执行 JSON Schema 校验，而工具处理器又使用 `Boolean()`、`Number()` 强制转换输入。结果是非法参数不仅没有报错，还会改变设备状态。

当前优先级如下：

| 编号 | 优先级 | 结论 | 影响 |
|---|---|---|---|
| R1 | P0 | 工具处理器没有做运行时类型校验 | 非法或缺失参数会被强制转换，并执行错误操作 |
| R2 | P0 | Live URL、公开视频和公开仓库仍无法从项目验证 | Challenge 提交材料不完整 |
| R3 | P1 | 危险调用在调用端超时后，确认卡可能继续滞留 | 调用方已放弃，但页面仍允许执行过期请求 |
| R4 | P1 | 文档声称已完成原生/polyfill 双环境 E2E，证据不足 | 提交陈述高于实际验证程度 |
| R5 | P2 | 无效设备日志请求以“成功字符串”返回，而不是工具错误 | 智能体可能把无效调用当作成功结果 |
| R6 | P2 | 仓库分支为 `master`，提交文档使用 `main` 命令 | 发布时容易推送失败或推错分支 |

## 2. 本轮已验证内容

### 2.1 静态与构建检查

| 检查 | 结果 |
|---|---|
| `npm test` | 通过，14/14 测试通过 |
| `npm run build` | 通过，TypeScript 与 Vite production build 无错误 |
| `npm audit --omit=dev` | 通过，生产依赖 0 个已知漏洞 |
| Production preview | HTTP 200 |
| `Origin-Agent-Cluster` | 返回 `?1` |
| 浏览器控制台 | 本轮未捕获到 error/warn |
| Git 状态（复测前） | 干净 |

项目没有配置 `lint` 脚本，因此本轮无法执行 ESLint 类检查。构建通过不等同于风格与潜在规则检查全部通过。

### 2.2 ChatGPT 内置浏览器实测

内置浏览器显示“WebMCP 原生连接”，并成功枚举 6 个工具：

1. `get_house_status`
2. `get_device_log`
3. `set_device_power`
4. `set_thermostat`
5. `shut_off_main_valve`
6. `kill_main_breaker`

已通过的真实交互：

- 演习未开始时，`get_house_status` 可读取状态。
- 演习未开始时，普通写操作和危险操作都会被阶段门卫拒绝。
- 管道爆裂后，`get_house_status` 能返回故障、水位、损失和设备状态。
- `get_device_log(main_valve)` 能返回压力异常和爆裂线索。
- `set_device_power(kitchen_light, true)` 能开启灯；重复同一调用返回“already on”，状态不会反转。
- 人工点击总电闸、确认后，总电闸和市电设备在同一状态更新中关闭，冰箱损失只增加一次。
- 断电后再通过 WebMCP 开启市电设备会收到明确错误。
- 中英文切换正常。
- 默认桌面视口和 390×844 移动视口均能完成启动与主要操作；移动视口需要滚动，但未发现横向溢出或不可点击控件。

## 3. 已确认问题与解决思路

### R1 / P0：JSON Schema 没有形成实际的运行时边界

#### 已复现证据

工具 Schema 正确声明了类型和必填字段，但 [`src/mcp/tools.ts`](../src/mcp/tools.ts) 在执行时做了宽松转换：

```ts
const on = Boolean(input.on);
const targetC = Number(input.targetC);
```

在 ChatGPT 内置浏览器中实测：

| 调用 | 预期 | 实际 |
|---|---|---|
| `set_device_power({ deviceId: "robot_vacuum", on: "false" })` | 拒绝：`on` 不是 boolean | 调用成功，并把设备开启 |
| `set_device_power({ deviceId: "smart_lock" })` | 拒绝：缺少必填 `on` | 调用成功，并把智能门锁关闭 |
| `set_thermostat({ targetC: "20" })` | 拒绝：`targetC` 不是 number | 调用成功，温控设为 20°C |

其中第二项风险最高：缺少字段会被 `Boolean(undefined)` 转成 `false`，因此一次格式错误的调用可以直接关掉设备。

#### 根因判断

JSON Schema 是对工具调用方的契约描述，不能假设所有原生实现或 polyfill 都会在进入 `execute()` 前替业务代码完成校验。当前自动化测试只覆盖合法输入和业务状态，没有从工具处理器入口覆盖错误类型和缺失字段。

#### 最短可靠修复

不需要新增校验库。在工具边界使用显式类型守卫，并禁止 `Boolean()` / `Number()` / `String()` 代替校验：

```ts
if (typeof input.on !== 'boolean') {
  throw new Error('"on" is required and must be a boolean.');
}

if (typeof input.targetC !== 'number' || !Number.isFinite(input.targetC)) {
  throw new Error('"targetC" is required and must be a finite number between 16 and 30.');
}
```

同时建议给对象 Schema 增加 `additionalProperties: false`，但它只能作为契约补充，不能替代处理器内校验。

#### 必补测试

- 缺少 `on`：调用失败，目标设备状态不变。
- `on: "false"`、`on: 0`、`on: null`：全部失败，状态不变。
- `targetC: "20"`、`null`、非有限数值：全部失败，温控状态不变。
- 合法的 `on: false` 和数值 `targetC: 20` 仍成功。
- 测试必须从 `buildTools()` 返回的 `execute()` 入口调用，不能只测 Zustand store。

#### 验收标准

所有无效输入都返回工具错误，且错误调用前后 store 快照一致。

### R2 / P0：Challenge 提交物仍未闭环

#### 已确认事实

- [`README.md`](../README.md) 仍显示 `Live Demo: TBD` 和 `Demo Video: TBD`。
- 当前仓库没有配置 Git remote，因此无法验证公开仓库。
- [`docs/SUBMISSION.md`](SUBMISSION.md) 的最终提交清单仍未完成。

这些项目可能已经在仓库外准备，但当前项目没有可核验证据。

#### 解决顺序

1. 先部署并从公网验证 Live URL、HTTPS、HTTP 200 和 `Origin-Agent-Cluster: ?1`。
2. 在公网地址用 ChatGPT 内置浏览器重跑 6 个工具和危险确认主链。
3. 录制小于 3 分钟、带音频、可公开访问的视频，必须展示真实 WebMCP 调用。
4. 创建或关联公开 Git 仓库并推送源码。
5. 把 Live URL、Video URL、Repository URL 回填 README 和 Devpost。

### R3 / P1：危险操作缺少独立的过期回收

#### 本轮现象

通过真实 WebMCP 调用 `shut_off_main_valve` 后，页面正确显示确认卡。测试调用端约 24 秒后超时，但没有把取消信号传递给页面，确认卡继续存在。之后人工确认仍会关闭水阀，水位也会正常回落。

这里需要区分两件事：

- 已确认：页面状态可以在调用端已超时后继续保留并执行该请求。
- 尚不能确认：超时是否来自 HomeGuard、内置浏览器测试通道，还是它们之间的取消信号没有贯通。

因此不应把它直接描述成“原生 WebMCP 不工作”，但它确实是一个过期请求风险。

#### 解决思路

- 给 pending confirmation 增加独立超时，例如 20–30 秒；超时后调用 `rejectPending()` 并返回明确的 timeout 错误。
- pending 数据携带唯一 `requestId`，确认/拒绝时只处理当前 request，避免旧卡片影响新调用。
- 在确认卡上显示剩余时间，过期后按钮不可用并自动关闭。
- 增加取消信号测试、超时测试，以及“超时后点击旧确认按钮不能改变状态”的测试。
- 用真实人工点击完成一次公网原生 WebMCP 闭环并录屏；当前这条仍属于待验证项。

### R4 / P1：提交文案的 E2E 表述过度

[`docs/SUBMISSION.md`](SUBMISSION.md) 写有“原生/polyfill 双环境 E2E”。当前可证明的是：

- 有 14 条 Vitest 行为测试；
- 本轮在 ChatGPT 内置浏览器完成了工具枚举、读写、阶段门卫和页面确认状态验证；
- 尚未完成 polyfill 浏览器 E2E；
- 原生危险工具的“调用发起 → 人工批准 → 同一次工具调用成功返回”没有在本轮测试通道中闭环。

在补齐证据前，建议改成：“14 条行为测试，并在 ChatGPT 内置浏览器验证原生工具枚举、读写、阶段门卫与人工确认 UI。”

### R5 / P2：无效设备日志返回成功结果

实测 `get_device_log({ deviceId: "not-a-device" })` 返回一段包含可选设备列表的普通字符串，没有抛出工具错误。内容本身有帮助，但调用语义仍是“成功”。

建议保留这段纠错文案，同时改为抛出 `Error`。这样智能体既能看到合法枚举，也能可靠识别本次调用失败。

### R6 / P2：分支名称与文档命令不一致

当前分支是 `master`，而 [`docs/SUBMISSION.md`](SUBMISSION.md) 使用 `git push -u origin main`。二选一即可：

- 将本地分支统一改为 `main`，再按文档推送；或
- 保持 `master`，把文档命令同步改成 `master`。

不要在未确认远端默认分支前直接复制执行文档命令。

## 4. 对上一轮问题的复核

| 上一轮问题 | 当前状态 | 依据 |
|---|---|---|
| `toggle_device` 忽略目标状态 | 已修复 | 已改为 `set_device_power`；合法调用幂等实测通过 |
| 总电闸返回值与设备状态不一致 | 已修复 | 页面操作与 WebMCP 状态读取一致 |
| 演习开始前可执行写操作 | 已修复 | 普通写工具、危险工具均被拒绝 |
| StrictMode 重复注册 | 代码已修复，浏览器未见重复工具 | `dispose()`、AbortController 和批次回滚已存在；枚举结果为 6 个唯一工具 |
| polyfill 缺少执行参数导致崩溃 | 代码已兼容 | `options?.signal` 为可选；尚未做 polyfill 浏览器 E2E |
| 缺少自动化测试 | 已部分修复 | 14 条行为测试通过，但缺少工具入口非法参数测试 |
| README 产品边界失真 | 已修复 | 已明确为本地训练模拟器，不连接真实设备 |

## 5. 建议执行顺序

1. 修复 R1，并补工具处理器入口的非法参数测试。
2. 为危险确认增加 request ID 与独立超时，补取消/过期测试。
3. 重跑 `npm test`、`npm run build`、生产依赖审计。
4. 在 ChatGPT 内置浏览器复测所有非法输入，以及危险操作批准、拒绝、超时三条路径。
5. 修正文档中的 E2E 表述与分支命令。
6. 部署公网版本，核验响应头和真实 WebMCP。
7. 完成公开视频、公开仓库和 Devpost 回填。

## 6. Phase 1 完成标准

- [x] 设备电源工具对合法输入幂等。
- [x] 总电闸状态原子更新，损失只记一次。
- [x] 演习阶段门卫同时约束 UI 与工具调用。
- [x] `npm test` 与 `npm run build` 通过。
- [x] ChatGPT 内置浏览器能枚举 6 个唯一工具。
- [x] 内置浏览器中的只读工具、普通写工具和状态同步通过。
- [x] 桌面和 390×844 移动视口完成基本可用性检查。
- [ ] 工具处理器拒绝缺失字段和错误类型，且错误调用不改变状态。
- [ ] 危险调用的批准、拒绝、取消、超时均有自动化测试和真实浏览器闭环。
- [ ] polyfill 浏览器 E2E 完成。
- [ ] Live URL 可公开访问并返回正确响应头。
- [ ] 公开仓库、公开视频和 Devpost 信息全部可验证。
- [ ] README 与提交文案不再包含 TBD 或超出证据的陈述。

在未完成以上未勾选项目之前，准确的项目状态是“核心演示可用，尚未提交就绪”。

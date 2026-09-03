# Phase 1：当前问题审查与修复方案

> 检查日期：2026-09-03  
> 项目：HomeGuard — 智能屋抢救行动  
> 阶段结论：代码可构建，但尚未达到“可直接提交 WebMCP Challenge”的状态

## 1. 本阶段真正要解决的问题

Phase 1 的目标不是继续增加功能，而是让现有演示形成一个可信、可验证、可提交的闭环：

1. WebMCP 工具的描述、参数、返回值和页面状态必须一致。
2. 演习不能被开始前的操作绕过。
3. 工具注册和取消流程在开发环境、原生 WebMCP 和 polyfill 下都不能产生误导。
4. 项目必须补齐公开仓库、Live URL、项目说明和演示视频等提交物。

官方评审关注四项：WebMCP Leverage、Execution、Potential Impact、Creativity & Ambition。当前项目的创意和演示结构已经成立，主要风险集中在 Execution 和 WebMCP Leverage 的可信度。

参考：

- [OpenAI WebMCP Challenge](https://openai.com/zh-Hans-CN/webmcp-challenge/)
- [Devpost 提交要求与评分标准](https://webmcp.devpost.com/)
- [Chrome WebMCP 文档](https://developer.chrome.com/docs/ai/webmcp)
- [WebMCP 规范](https://webmachinelearning.github.io/webmcp/)

## 2. 已确认的可用部分

- `npm run build` 已通过，TypeScript 和 Vite 生产构建无错误。
- `npm run preview` 返回 HTTP 200。
- 预览响应包含 `Origin-Agent-Cluster: ?1`。
- `npm ls --depth=0` 未发现依赖树错误。
- `npm audit --omit=dev` 未发现生产依赖漏洞。
- 已实现 6 个 WebMCP 工具、结构化 JSON Schema、只读标记、确认卡片和取消信号处理。
- UI 与工具调用共用 Zustand action，架构方向正确。
- MIT License 和本地运行说明已经存在。

这些结果只能证明项目能够构建和启动，不能替代原生 ChatGPT 内置浏览器或启用 WebMCP 的 Chrome 验证。

## 3. 问题总览

| 编号 | 优先级 | 问题 | 主要影响 |
|---|---|---|---|
| P0-01 | P0 | Challenge 提交物在当前目录中未形成闭环 | 无法完成有效提交 |
| P0-02 | P0 | `toggle_device` 忽略 `on` 参数 | 工具契约不可信，重试会反向操作 |
| P0-03 | P0 | `kill_main_breaker` 返回值与设备状态不一致 | 页面显示与工具结果冲突 |
| P0-04 | P0 | 演习开始前可以关闭总水阀 | 可绕过核心剧情和评分机制 |
| P1-01 | P1 | React StrictMode 下可能重复注册工具 | 开发环境出现 `InvalidStateError` |
| P1-02 | P1 | polyfill 不传递第二个执行参数 | 危险工具可能因缺少 `signal` 崩溃 |
| P1-03 | P1 | 缺少自动化行为测试 | 修复后容易回归，无法证明可靠性 |
| P2-01 | P2 | README 的“随机故障”与实现不符 | 产品描述失真 |
| P2-02 | P2 | 产品定位偏 Demo，现实受众不够具体 | Potential Impact 说服力不足 |

## 4. P0 问题与解决思路

### P0-01：提交物尚未闭环

#### 现状

Devpost 要求至少提供：

- 公开可访问的 Live URL；
- 项目文字说明；
- 少于 3 分钟、带音频的公开 YouTube 演示视频；
- GitHub、GitLab 或 Bitbucket 的公开代码仓库；
- 仓库内可见的开源许可证、完整源码和运行说明。

当前项目目录不是 Git 仓库；目录内也未发现 Live URL、视频地址或完成的提交文案。它们可能已经存在于外部，但目前无法从项目中验证。

#### 解决思路

1. 初始化 Git，并只提交源码、必要资源和文档；不要提交 `node_modules/`、`dist/`。
2. 创建公开仓库，在仓库 About 区域设置项目描述、Live URL 和 License。
3. 部署到 Netlify、Cloudflare Pages 或其他静态托管平台。
4. 从部署地址检查 HTTP 200 和 `Origin-Agent-Cluster: ?1`，不要只验证本地 preview。
5. 在 ChatGPT 内置浏览器或启用 WebMCP flag 的 Chrome 中录制真实调用。
6. 将项目说明和视频脚本纳入仓库，避免提交表单与实现发生漂移。

#### 验收标准

- 无登录状态下可以打开 Live URL。
- 公开仓库可以从零执行 `npm install && npm run build`。
- README 顶部可以直接找到 Live Demo、Video、License。
- 视频时长少于 3 分钟，有音频，并展示真实工具调用而非只调用调试手柄。

### P0-02：`toggle_device` 忽略目标状态

#### 证据

[`src/mcp/tools.ts`](src/mcp/tools.ts) 的 Schema 声明了可选参数 `on`，并说明 `true` 为开启、`false` 为关闭；但执行时只把 `deviceId` 传给 `toggleDevice()`。[`src/store.ts`](src/store.ts) 中的 action 永远执行 `!device.on`。

实际结果：连续两次调用：

```json
{"deviceId":"kitchen_light","on":true}
```

第一次会开启灯，第二次反而会关闭灯。

#### 风险

- 智能体重试时会撤销第一次操作。
- 参数描述与实际行为不一致，属于 WebMCP 意图误表示。
- 演示视频中一旦出现重试，结果不可预测。

#### 推荐方案

把工具改成“设置设备电源状态”，要求 `on` 参数，并保证幂等：

```ts
setDevicePower(deviceId, on, actor)
```

- 当前状态已经等于 `on` 时，返回成功但不重复写事件。
- 只有目标状态不同时才更新设备。
- 工具名可改为 `set_device_power`；若不想改名，至少必须让 `toggle_device` 的描述和参数与实现保持一致。

最短备选方案是删除 `on` 参数，让工具只表示“翻转”。但这种方案不适合智能体重试，因此不推荐作为最终提交版本。

#### 验收标准

- 连续两次调用 `on: true` 后设备仍保持开启。
- 连续两次调用 `on: false` 后设备仍保持关闭。
- 不支持的设备 ID 返回可纠正错误，不改变任何状态。

### P0-03：总电闸状态不一致

#### 证据

`kill_main_breaker` 返回“全屋断电、冰箱已断电”，但确认操作只把 `main_breaker.on` 改为 `false`。冰箱要等下一次 tick 才关闭，客厅灯和温控器会继续显示开启。

相关文件：

- [`src/mcp/tools.ts`](src/mcp/tools.ts)
- [`src/store.ts`](src/store.ts)
- [`src/sim/engine.ts`](src/sim/engine.ts)

#### 风险

- 工具完成时 UI 尚未反映工具声称的结果。
- 智能体后续读取状态时会看到互相矛盾的数据。
- 用户可能基于错误的“已断电”结果继续处理险情。

#### 推荐方案

在 `confirmPending()` 的断电分支中一次性完成原子更新：

1. 设置 `breakerOff: true` 和 `main_breaker.on: false`。
2. 同时关闭所有依赖市电的设备。
3. 同一次状态更新中记录冰箱损失，避免等下一次 tick。
4. 完成状态更新后再 resolve 工具 Promise。

现阶段不必新增复杂的电力拓扑模型。可以先使用一个明确的市电设备列表；只有未来加入多个回路时，再为设备增加 `powerSource` 或 `circuitId`。

#### 验收标准

- 工具 Promise resolve 时，所有市电设备已经显示关闭。
- 损失分数只增加一次。
- 下一次 tick 不会重复增加冰箱损失。
- 断电后不能通过普通设备工具重新开启市电设备。

### P0-04：可以在演习开始前绕过故障

#### 证据

WebMCP 工具在应用加载时注册，`requestDestructive()` 没有检查 `scenario.phase`。在 `idle` 阶段关闭水阀后再开始演习，8 秒时会同时触发“水管爆裂”和“险情解除”，水位始终为 0。

#### 推荐方案

在共享 store action 中增加统一阶段校验，而不是只在 UI 按钮上禁用：

- `idle`：允许只读工具，拒绝设备和危险操作；
- `active`：允许正常诊断与处置；
- `resolved`：只允许只读复盘，拒绝继续修改场景。

UI 也应同步禁用非当前阶段可用的按钮，但 store 校验才是最终边界，因为智能体不经过按钮。

如果时间充足，可以按阶段注册/注销工具；若临近提交，保留静态注册并在 execute 中返回明确的阶段错误更简单可靠。

#### 验收标准

- `idle` 和 `resolved` 阶段调用变更工具不会改变状态。
- 错误结果明确告诉智能体需要先开始演习或演习已经结束。
- 正常演习仍能通过“读取状态 → 查看日志 → 请求关阀 → 用户确认”完成。

## 5. P1 问题与解决思路

### P1-01：工具注册缺少生命周期清理

#### 现状

`App` 在 Effect 中调用 `setupWebMcp()`，但没有 cleanup。`setupWebMcp()` 创建的 `AbortController` 也没有返回。React StrictMode 在开发模式会重复执行 Effect，导致相同工具再次注册并触发 `InvalidStateError`。

注册中途失败时，已经成功注册的工具也没有被 abort，可能留下半套工具。

#### 推荐方案

- 让 `setupWebMcp()` 接收或返回注册控制器/cleanup 函数。
- Effect cleanup 中 abort 当前注册作用域。
- 任意一个工具注册失败时，立即 abort 已完成的本批注册。
- 状态更新只允许当前有效的注册任务写入，避免旧任务覆盖新任务状态。

#### 验收标准

- React StrictMode 下控制台没有重复注册错误。
- 组件卸载或 HMR 后旧工具被注销。
- 任一工具注册失败时，不会留下部分工具。

### P1-02：polyfill 的执行参数兼容问题

#### 现状

当前 polyfill 不会把第二个执行参数传递给本地 imperative callback，而两个危险工具直接解构 `{ signal }`。通过 `window.__homeguard.executeTool()` 测试时会手工补入 signal，因此会掩盖真实 polyfill 调用的问题。

项目内的兼容说明已经记录了这一限制：[`skills/webmcp/references/compatibility.md`](skills/webmcp/references/compatibility.md)。

#### 推荐方案

1. 让 execute options 支持缺省值，缺少 signal 时使用本地 fallback signal。
2. 保留原生 Chrome 下的真实取消传播验证。
3. 测试应调用实际 `modelContext.getTools()` / `modelContext.executeTool()`；调试手柄只能作为辅助，不能作为通过标准。
4. README 明确说明 polyfill 能验证什么、不能验证什么。

#### 验收标准

- polyfill 模式调用危险工具不会因解构 `undefined` 崩溃。
- 原生 Chrome 中取消工具调用会清除确认卡片。
- 调试手柄与真实 model context 的结果一致。

### P1-03：缺少行为测试

#### 推荐的最小测试集

不要追求完整覆盖率，先覆盖最容易让演示失败的路径：

1. `set_device_power` 幂等性。
2. `idle` / `active` / `resolved` 三阶段权限。
3. 拉总电闸后的设备状态与损失只计算一次。
4. 关闭水阀后积水停止上涨并最终归零。
5. 用户拒绝危险操作后状态不变。
6. AbortSignal 取消后确认卡片消失。
7. 重复挂载注册逻辑不产生重复工具。

可增加 Vitest 作为唯一测试依赖，并在 `package.json` 中提供 `npm test`。不要在截止前搭建大型测试框架或追求覆盖率指标。

## 6. P2 产品与文档问题

### P2-01：产品描述与实现不一致

README 写的是房屋会随机“出故障”，当前引擎只有一个固定的厨房漏水场景。两种修复方式任选其一：

- 最短方案：将 README 改为“厨房漏水应急演习”；
- 后续方案：真正实现多个随机场景。

Phase 1 推荐修改文案，不建议为了匹配一句描述临时增加更多场景。

### P2-02：现实影响论证不足

当前项目本质上是模拟器，不应暗示已经能够安全控制真实住宅。更可信的定位是：

> 面向智能家居厂商、物业服务和家庭用户的应急处置训练模拟器，用来验证智能体如何读取实时设备状态、提出操作建议，并在高风险动作前把决定权交还给人。

提交说明应明确：

- 真实问题：复杂设备面板和故障日志增加应急处置成本；
- WebMCP 的必要性：DOM 点击无法稳定表达设备语义、危险副作用和确认边界；
- 人机协作：智能体负责诊断和建议，人类批准不可逆或高影响操作；
- 当前边界：演示使用本地模拟状态，不直接连接真实家庭设备。

## 7. 建议的最短修复顺序

### 第一批：保证演示结果可信

1. 修复设备目标状态。
2. 修复总电闸的原子状态更新。
3. 增加阶段校验。
4. 增加上述行为的最小测试。

### 第二批：保证 WebMCP 生命周期可信

1. 修复注册 cleanup 和部分注册失败回滚。
2. 修复 polyfill 缺少 options 的兼容处理。
3. 使用真实 model context 验证工具列表、Schema、返回值和取消。

### 第三批：完成提交闭环

1. 初始化并发布公开仓库。
2. 部署 Live URL，验证线上响应头。
3. 完成 Devpost 项目说明。
4. 录制小于 3 分钟的真实演示视频。
5. 从全新环境重新执行 README 的安装和运行步骤。

## 8. 建议缩减的范围

核心演示链只有四个必要工具：

1. `get_house_status`
2. `get_device_log`
3. `shut_off_main_valve`
4. `kill_main_breaker`

`toggle_device` 和 `set_thermostat` 与漏水主线关系较弱。如果无法在提交前完成可靠修复和验证，可以不在演示主线中使用；如果它们仍可能误导智能体，宁可暂时移除。工具数量不是评分目标，准确、可组合、可验证才是。

## 9. Phase 1 完成标准

- [ ] P0-02、P0-03、P0-04 已修复并有可重复测试。
- [ ] `npm test` 和 `npm run build` 均通过。
- [ ] React StrictMode 下无重复注册错误。
- [ ] 原生 WebMCP 环境能枚举预期工具及其 Schema/annotations。
- [ ] 有效输入、无效输入、拒绝确认、批准确认和取消调用均验证通过。
- [ ] 工具返回时 UI 已反映对应状态。
- [ ] Live URL 可公开访问并返回正确响应头。
- [ ] 公开仓库包含源码、License 和可复现说明。
- [ ] Devpost 文案和小于 3 分钟的演示视频准备完成。
- [ ] README 不再包含与实现不一致的描述。

## 10. 暂未验证的部分

- ChatGPT 内置浏览器中的真实工具调用。
- 启用 WebMCP flag 的 Chrome 中的注册、调用和取消行为。
- 实际公开部署地址及其 CDN 响应头。
- 公开仓库、Devpost 表单和 YouTube 视频是否已在项目外创建。
- 移动端和键盘操作的完整可访问性。

在这些项目完成前，应把当前版本称为“可运行原型”，而不是“提交就绪版本”。

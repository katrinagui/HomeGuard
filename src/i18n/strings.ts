// Bilingual string dictionary. UI-facing strings live here; the agent-facing
// tool contract (descriptions, returns, store messages) is English-only by
// design — see src/mcp/tools.ts.

export const STRINGS = {
  zh: {
    'app.title': 'HomeGuard — 智能屋抢救行动',

    'ui.readout.elapsed': '用时',
    'ui.readout.damage': '损失',
    'ui.mcp.ready': 'WebMCP 原生连接',
    'ui.mcp.polyfill': 'WebMCP polyfill 演示',
    'ui.mcp.registering': '检测 WebMCP…',
    'ui.mcp.error': 'WebMCP 注册失败',
    'ui.mcp.unsupported': 'WebMCP 不可用',

    'ui.banner.notice': '提示',
    'ui.banner.emergency': '紧急',
    'ui.banner.alarmText':
      '厨房供水管爆裂，积水 {water} cm 且持续上涨。可召唤 ChatGPT 智能体协助，或亲自处理。',

    'ui.card.room': 'ROOM',
    'ui.card.mains': 'MAINS',
    'ui.card.mainsTitle': '公用管路',
    'ui.card.log': '事件日志',
    'ui.card.logNote': 'EVENT LOG',
    'ui.sensor.temp': '温度 TEMP',
    'ui.sensor.humidity': '湿度 RH',
    'ui.sensor.water': '积水 WATER',
    'ui.action.on': '开启',
    'ui.action.off': '关闭',
    'ui.utility.valve': '总水阀',
    'ui.utility.breaker': '总电闸',
    'ui.utility.shutValve': '关闭总水阀…',
    'ui.utility.valveShut': '已关闭',
    'ui.utility.killBreaker': '拉下总电闸…',
    'ui.utility.breakerOff': '已断开',

    'ui.start.sub': '智能屋抢救行动 · 应急处置演习',
    'ui.start.body':
      '你家的厨房供水管即将爆裂。你可以亲自抢修，也可以召唤 ChatGPT 智能体担任物业管家——它通过本页注册的 WebMCP 工具读取全屋状态、翻查设备日志、定位故障，并在执行任何危险操作前，把决定权交还给你。',
    'ui.start.hint.ready': 'WebMCP 已就绪：智能体可以看到本页注册的全部工具。',
    'ui.start.hint.polyfill': '当前浏览器不支持原生 WebMCP，已启用 polyfill 演示模式。',
    'ui.start.hint.registering': '正在检测 WebMCP…',
    'ui.start.hint.unavailable': 'WebMCP 不可用：你仍可手动游玩，但智能体无法看到本页工具。',
    'ui.start.begin': '开始演习',

    'ui.confirm.kicker': '危险操作 · REQUIRES CONFIRMATION',
    'ui.confirm.valveTitle': '关闭总水阀',
    'ui.confirm.valveBody':
      '全屋将立即停水；正在运行的洗衣机/洗碗机将停止。这是止住厨房漏水的唯一手段。',
    'ui.confirm.valveApprove': '确认关闭总水阀',
    'ui.confirm.breakerTitle': '拉下总电闸',
    'ui.confirm.breakerBody':
      '全屋市电设备将立即断电。冰箱接在同一回路，冷藏食材会报废（损失 +120 分）。请确认是否继续。',
    'ui.confirm.breakerApprove': '确认拉下总电闸',
    'ui.confirm.reject': '拒绝',
    'ui.confirm.agentSource': '来源：ChatGPT 智能体请求执行此操作',

    'ui.debrief.kicker': 'AFTER-ACTION REPORT',
    'ui.debrief.title': '险情解除',
    'ui.debrief.damage': '损失分数（越低越好）',
    'ui.debrief.time': '处置用时',
    'ui.debrief.calls': '智能体调用 / 人工操作',
    'ui.debrief.timelineHead': '智能体操作复盘 · AGENT TIMELINE',
    'ui.debrief.thTime': '时间',
    'ui.debrief.thTool': '工具',
    'ui.debrief.thInput': '输入',
    'ui.debrief.thResult': '结果',
    'ui.debrief.none':
      '本次全程人工处置，智能体未执行任何工具调用。再玩一次，试试召唤 ChatGPT。',
    'ui.debrief.again': '再来一次',
    'ui.debrief.outcome.ok': '成功',
    'ui.debrief.outcome.pending': '等待确认',
    'ui.debrief.outcome.rejected': '被拒绝',
    'ui.debrief.outcome.error': '出错',

    'grade.gold': '金牌管家',
    'grade.qualified': '合格管家',
    'grade.low': '勉强及格',

    'mcp.detail.unsupported':
      '当前浏览器不支持 WebMCP。可用 Chrome 并开启 chrome://flags/#enable-webmcp-testing，或在 ChatGPT 应用内打开本页。',

    'event.init': 'HomeGuard 已接管本屋。一切正常。',
    'event.start': '演习开始，房屋状态进入实时监控。',
    'event.leak': '厨房水浸传感器触发：供水管爆裂，积水持续上涨。',
    'event.resolved': '厨房积水已排净，险情解除。',
    'event.deviceOn': '{nameZh}已开启。',
    'event.deviceOff': '{nameZh}已关闭。',
    'event.thermostat': '温控目标已设为 {target}°C。',
    'event.request': '「{labelZh}」请求已发出，等待用户确认。',
    'event.valveShut': '总水阀已关闭，供水切断，漏水停止。',
    'event.breakerOff': '总电闸已拉下：全屋断电，冰箱等市电设备全部停止（食材报废，损失 +{penalty} 分）。',
    'event.rejected': '用户拒绝了「{labelZh}」。',

    'tl.status': '损失 {score} 分',
    'tl.approved': '用户批准，总水阀已关闭',
    'tl.breakerApproved': '用户批准，总电闸已拉下',
    'tl.rejected': '用户拒绝了本次操作',
  },

  en: {
    'app.title': 'HomeGuard — Smart-Home Emergency Drill',

    'ui.readout.elapsed': 'ELAPSED',
    'ui.readout.damage': 'LOSS',
    'ui.mcp.ready': 'WebMCP native',
    'ui.mcp.polyfill': 'WebMCP polyfill demo',
    'ui.mcp.registering': 'Detecting WebMCP…',
    'ui.mcp.error': 'WebMCP registration failed',
    'ui.mcp.unsupported': 'WebMCP unavailable',

    'ui.banner.notice': 'NOTICE',
    'ui.banner.emergency': 'EMERGENCY',
    'ui.banner.alarmText':
      'The kitchen supply pipe has burst — standing water {water} cm and rising. Summon the ChatGPT butler, or handle it yourself.',

    'ui.card.room': 'ROOM',
    'ui.card.mains': 'MAINS',
    'ui.card.mainsTitle': 'Utility Lines',
    'ui.card.log': 'Event Log',
    'ui.card.logNote': 'EVENT LOG',
    'ui.sensor.temp': 'TEMPERATURE',
    'ui.sensor.humidity': 'HUMIDITY',
    'ui.sensor.water': 'WATER',
    'ui.action.on': 'On',
    'ui.action.off': 'Off',
    'ui.utility.valve': 'Main Valve',
    'ui.utility.breaker': 'Main Breaker',
    'ui.utility.shutValve': 'Shut off valve…',
    'ui.utility.valveShut': 'Shut',
    'ui.utility.killBreaker': 'Kill breaker…',
    'ui.utility.breakerOff': 'Off',

    'ui.start.sub': 'AN AGENT-NATIVE SMART-HOME EMERGENCY DRILL',
    'ui.start.body':
      'A pipe in your kitchen is about to burst. Fix it yourself — or summon a ChatGPT agent as your property butler. Through the WebMCP tools registered on this page it reads the whole-house state, digs through device logs, pinpoints the fault, and hands every dangerous decision back to you before acting.',
    'ui.start.hint.ready': 'WebMCP is ready: the agent can see every tool registered on this page.',
    'ui.start.hint.polyfill': 'Native WebMCP is unavailable here; polyfill demo mode is on.',
    'ui.start.hint.registering': 'Detecting WebMCP…',
    'ui.start.hint.unavailable': 'WebMCP unavailable: you can still play manually, but agents cannot see the tools.',
    'ui.start.begin': 'Start the drill',

    'ui.confirm.kicker': 'DESTRUCTIVE ACTION · REQUIRES CONFIRMATION',
    'ui.confirm.valveTitle': 'Shut off the main valve',
    'ui.confirm.valveBody':
      'The whole home loses water immediately; running washing machines and dishwashers stop. This is the only way to stop the kitchen leak.',
    'ui.confirm.valveApprove': 'Confirm: shut off valve',
    'ui.confirm.breakerTitle': 'Kill the main breaker',
    'ui.confirm.breakerBody':
      'Every mains-powered device goes down at once. The fridge is on this circuit — its food will spoil (+120 damage). Continue?',
    'ui.confirm.breakerApprove': 'Confirm: kill breaker',
    'ui.confirm.reject': 'Reject',
    'ui.confirm.agentSource': 'Requested by the ChatGPT agent',

    'ui.debrief.kicker': 'AFTER-ACTION REPORT',
    'ui.debrief.title': 'Emergency resolved',
    'ui.debrief.damage': 'Damage score (lower is better)',
    'ui.debrief.time': 'Time to resolve',
    'ui.debrief.calls': 'Agent calls / Human actions',
    'ui.debrief.timelineHead': 'AGENT TIMELINE',
    'ui.debrief.thTime': 'Time',
    'ui.debrief.thTool': 'Tool',
    'ui.debrief.thInput': 'Input',
    'ui.debrief.thResult': 'Result',
    'ui.debrief.none':
      'No agent tool calls this round — you handled it all yourself. Run it again and summon ChatGPT.',
    'ui.debrief.again': 'Run it again',
    'ui.debrief.outcome.ok': 'OK',
    'ui.debrief.outcome.pending': 'Awaiting confirmation',
    'ui.debrief.outcome.rejected': 'Rejected',
    'ui.debrief.outcome.error': 'Error',

    'grade.gold': 'Gold-medal butler',
    'grade.qualified': 'Qualified butler',
    'grade.low': 'Barely passing',

    'mcp.detail.unsupported':
      'This browser does not support WebMCP. Use Chrome with chrome://flags/#enable-webmcp-testing, or open this page inside ChatGPT.',

    'event.init': 'HomeGuard online. All systems normal.',
    'event.start': 'Drill started — the house is now live.',
    'event.leak': 'Kitchen water sensor triggered: supply pipe burst, water rising.',
    'event.resolved': 'Standing water drained. Emergency resolved.',
    'event.deviceOn': '{nameEn} switched on.',
    'event.deviceOff': '{nameEn} switched off.',
    'event.thermostat': 'Thermostat target set to {target}°C.',
    'event.request': '"{labelEn}" requested — waiting for the user to confirm.',
    'event.valveShut': 'Main valve shut — supply cut, leak stopped.',
    'event.breakerOff':
      'Main breaker off: the whole house is dark, all mains devices down (food spoiled, +{penalty} damage).',
    'event.rejected': 'User rejected "{labelEn}".',

    'tl.status': 'damage {score}',
    'tl.approved': 'user approved — main valve shut',
    'tl.breakerApproved': 'user approved — main breaker off',
    'tl.rejected': 'rejected by user',
  },
} as const;

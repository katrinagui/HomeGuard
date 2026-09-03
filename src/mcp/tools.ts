// The 6 registered WebMCP tools. Tool handlers are thin wrappers over store
// actions: same code path as the UI buttons, so agent and human actions are
// indistinguishable in state and logs.

import { useHouse } from '../store';
import type { DeviceId } from '../sim/house';
import { deviceLogLines } from '../sim/engine';

export interface ToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute(input: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<unknown> | unknown;
}

const SETTABLE_DEVICE_IDS = ['kitchen_light', 'living_room_light', 'robot_vacuum', 'thermostat', 'smart_lock'] as const;

export function buildTools(): ToolDefinition[] {
  return [
    {
      name: 'get_house_status',
      title: '读取全屋状态',
      description:
        '读取智能屋的完整实时状态：每个房间的温度、湿度、积水深度，每台设备的开关与故障情况，' +
        '当前活跃的紧急事件，以及累计损失分数。诊断任何问题前请先调用本工具。',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: () => {
        const { house } = useHouse.getState();
        useHouse.getState().logToolCall({
          tool: 'get_house_status',
          input: {},
          outcome: 'ok',
          detail: `损失 ${Math.round(house.scenario.damageScore)} 分`,
          actor: 'agent',
        });
        return {
          phase: house.scenario.phase,
          elapsedSeconds: Math.round(house.scenario.elapsed),
          damageScore: Math.round(house.scenario.damageScore),
          rooms: Object.values(house.rooms).map((r) => ({
            room: r.name,
            temperatureC: r.temperatureC,
            humidityPct: Math.round(r.humidityPct),
            waterLevelCm: r.waterLevelCm,
          })),
          devices: Object.values(house.devices).map((d) => ({
            id: d.id,
            name: d.name,
            on: d.on,
          })),
          activeFaults: house.scenario.leakActive && !house.scenario.valveShut
            ? ['厨房供水管爆裂，积水持续上涨，需要关闭总水阀（shut_off_main_valve）']
            : [],
        };
      },
    },
    {
      name: 'get_device_log',
      title: '读取设备日志',
      description:
        '读取指定设备的事件日志，包含历史读数和故障记录。当 get_house_status 报告设备异常时，' +
        '用本工具查看该设备的详细日志以定位原因。',
      inputSchema: {
        type: 'object',
        properties: {
          deviceId: {
            type: 'string',
            description: '设备 ID，例如 main_valve、kitchen_fridge、main_breaker',
          },
        },
        required: ['deviceId'],
      },
      annotations: { readOnlyHint: true },
      execute: (input) => {
        const deviceId = String(input.deviceId ?? '');
        const house = useHouse.getState().house;
        if (!(deviceId in house.devices)) {
          const msg = `错误：未找到设备 "${deviceId}"。可用设备：${Object.keys(house.devices).join('、')}。`;
          useHouse.getState().logToolCall({
            tool: 'get_device_log',
            input,
            outcome: 'error',
            detail: msg,
            actor: 'agent',
          });
          return msg;
        }
        useHouse.getState().logToolCall({
          tool: 'get_device_log',
          input,
          outcome: 'ok',
          detail: deviceId,
          actor: 'agent',
        });
        const lines = deviceLogLines(house, deviceId);
        return {
          deviceId,
          log: lines.map((l) => `[t+${l.t}s] ${l.text}`),
        };
      },
    },
    {
      name: 'set_device_power',
      title: '设置设备电源',
      description:
        '把一台普通设备设置为指定的电源状态（幂等：重复设置同一状态不会产生副作用）。' +
        '灯具、扫地机器人、温控器、智能门锁适用。总水阀和总电闸不适用本工具，' +
        '请分别使用 shut_off_main_valve 和 kill_main_breaker。',
      inputSchema: {
        type: 'object',
        properties: {
          deviceId: {
            type: 'string',
            description: '要操作的设备 ID',
            enum: [...SETTABLE_DEVICE_IDS],
          },
          on: {
            type: 'boolean',
            description: '目标电源状态：true 为开启，false 为关闭（必填）',
          },
        },
        required: ['deviceId', 'on'],
      },
      execute: (input) => {
        const deviceId = String(input.deviceId ?? '') as DeviceId;
        const on = Boolean(input.on);
        const result = useHouse.getState().setDevicePower(deviceId, on, 'agent');
        useHouse.getState().logToolCall({
          tool: 'set_device_power',
          input,
          outcome: result.ok ? 'ok' : 'error',
          detail: result.message,
          actor: 'agent',
        });
        if (!result.ok) throw new Error(result.message);
        return result.message;
      },
    },
    {
      name: 'set_thermostat',
      title: '设定温控目标',
      description: '设定中央温控器的目标温度（16–30°C）。房间温度会逐渐向目标靠拢。',
      inputSchema: {
        type: 'object',
        properties: {
          targetC: { type: 'number', description: '目标温度，摄氏度，16 到 30 之间' },
        },
        required: ['targetC'],
      },
      execute: (input) => {
        const targetC = Number(input.targetC);
        const result = useHouse.getState().setThermostat(targetC, 'agent');
        useHouse.getState().logToolCall({
          tool: 'set_thermostat',
          input,
          outcome: result.ok ? 'ok' : 'error',
          detail: result.message,
          actor: 'agent',
        });
        if (!result.ok) throw new Error(result.message);
        return result.message;
      },
    },
    {
      name: 'shut_off_main_valve',
      title: '关闭总水阀（危险操作）',
      description:
        '【破坏性操作，需要用户在页面上确认】关闭全屋主水阀，立即止住厨房漏水。' +
        '副作用：全屋停水，正在运行的洗衣机/洗碗机停止。这是止水的唯一手段。',
      inputSchema: { type: 'object', properties: {} },
      execute: async (_input, options) => {
        const guard = destructiveGuard('shut_off_main_valve');
        if (guard) throw new Error(guard);
        useHouse.getState().logToolCall({
          tool: 'shut_off_main_valve',
          input: {},
          outcome: 'pending_confirmation',
          detail: '',
          actor: 'agent',
        });
        const outcome = await withAbort(
          useHouse.getState().requestDestructive('shut_off_main_valve', 'agent'),
          options?.signal,
        );
        if (outcome !== 'confirmed') {
          useHouse.getState().logToolCall({
            tool: 'shut_off_main_valve',
            input: {},
            outcome: 'rejected',
            detail: '用户拒绝了本次操作',
            actor: 'agent',
          });
          return '用户拒绝了关闭总水阀。请向用户说明漏水的紧急性，不要重复尝试。';
        }
        useHouse.getState().logToolCall({
          tool: 'shut_off_main_valve',
          input: {},
          outcome: 'ok',
          detail: '用户批准，总水阀已关闭',
          actor: 'agent',
        });
        return '总水阀已关闭，供水切断，厨房漏水已停止。积水会逐渐退去。';
      },
    },
    {
      name: 'kill_main_breaker',
      title: '拉下总电闸（危险操作）',
      description:
        '【破坏性操作，需要用户在页面上确认】拉下全屋总电闸，切断所有电力。' +
        '副作用：冰箱、灯具、温控器等市电设备全部立即断电，冷藏食材报废（损失 +120 分）。' +
        '仅在没有漏电风险顾虑需要断电时使用。',
      inputSchema: { type: 'object', properties: {} },
      execute: async (_input, options) => {
        const guard = destructiveGuard('kill_main_breaker');
        if (guard) throw new Error(guard);
        useHouse.getState().logToolCall({
          tool: 'kill_main_breaker',
          input: {},
          outcome: 'pending_confirmation',
          detail: '',
          actor: 'agent',
        });
        const outcome = await withAbort(
          useHouse.getState().requestDestructive('kill_main_breaker', 'agent'),
          options?.signal,
        );
        if (outcome !== 'confirmed') {
          useHouse.getState().logToolCall({
            tool: 'kill_main_breaker',
            input: {},
            outcome: 'rejected',
            detail: '用户拒绝了本次操作',
            actor: 'agent',
          });
          return '用户拒绝了拉下总电闸。请向用户了解顾虑后再决定下一步。';
        }
        useHouse.getState().logToolCall({
          tool: 'kill_main_breaker',
          input: {},
          outcome: 'ok',
          detail: '用户批准，总电闸已拉下',
          actor: 'agent',
        });
        return '总电闸已拉下，全屋市电设备已断电。注意：冰箱已断电，食材正在变质。';
      },
    },
  ];
}

/**
 * Pre-flight checks for destructive tools. Returns a corrective error message
 * when the call cannot proceed, or null when it may. The store re-checks both
 * conditions as a hard boundary; this guard exists so the agent receives a
 * precise message instead of a misleading "user rejected" outcome.
 */
function destructiveGuard(action: 'shut_off_main_valve' | 'kill_main_breaker'): string | null {
  const { house, pendingConfirmation } = useHouse.getState();
  if (house.scenario.phase === 'idle') return '演习尚未开始：请先在页面上点击「开始演习」。';
  if (house.scenario.phase === 'resolved') return '演习已结束：本工具仅供复盘查看，不能再执行操作。';
  if (action === 'shut_off_main_valve' && house.scenario.valveShut) {
    return '总水阀已经是关闭状态，无需重复操作。';
  }
  if (action === 'kill_main_breaker' && house.scenario.breakerOff) {
    return '总电闸已经是断开状态，无需重复操作。';
  }
  if (pendingConfirmation) {
    return `页面上已有一个等待确认的操作（${pendingConfirmation.action}），请等用户处理后再试。`;
  }
  return null;
}

/**
 * Race a store promise against the agent's cancellation signal, so an aborted
 * tool call cannot leave the confirmation card dangling on screen. The signal
 * is optional: the current polyfill does not pass execution options, while
 * native Chrome 153+ always does.
 */
function withAbort(
  promise: Promise<'confirmed' | 'rejected'>,
  signal?: AbortSignal,
): Promise<'confirmed' | 'rejected'> {
  if (!signal) return promise;
  if (signal.aborted) {
    useHouse.getState().rejectPending();
    return Promise.reject(new Error('工具调用已被取消。'));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      // Clear the card if it is still waiting; harmless if already resolved.
      useHouse.getState().rejectPending();
      reject(new Error('工具调用已被取消。'));
    };
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    signal.addEventListener('abort', onAbort);
    promise.then(
      (v) => {
        cleanup();
        resolve(v);
      },
      (e) => {
        cleanup();
        reject(e);
      },
    );
  });
}

// Single Zustand store shared by the UI and the WebMCP tool handlers.
// Every mutation goes through an action here so that human clicks and
// agent tool calls produce identical state transitions and log entries.
// The store is the final authority: phase gates and breaker constraints
// are enforced here, not only in the UI.

import { create } from 'zustand';
import type { DeviceId, HouseEvent, HouseState, ToolCallRecord } from './sim/house';
import { createInitialHouse, MAINS_POWERED_DEVICES, SPOILED_FOOD_PENALTY } from './sim/house';
import { tick } from './sim/engine';

export type ConfirmationAction = 'shut_off_main_valve' | 'kill_main_breaker';

export interface PendingConfirmation {
  action: ConfirmationAction;
  actor: 'human' | 'agent';
  /** resolves with 'confirmed' | 'rejected' once the user acts */
  resolve: (outcome: 'confirmed' | 'rejected') => void;
}

export type McpStatus = 'unsupported' | 'registering' | 'ready' | 'error' | 'polyfill';

export interface ActionResult {
  ok: boolean;
  message: string;
}

/** Mutating actions are only allowed while the exercise is active. */
function phaseGateError(phase: HouseState['scenario']['phase']): string | null {
  if (phase === 'idle') return '演习尚未开始：请先在页面上点击「开始演习」。';
  if (phase === 'resolved') return '演习已结束：本工具仅供复盘查看，不能再改变房屋状态。';
  return null;
}

interface HomeGuardStore {
  house: HouseState;
  pendingConfirmation: PendingConfirmation | null;
  mcpStatus: McpStatus;
  mcpDetail: string;

  startExercise: () => void;
  tickOnce: (dtSec: number) => void;
  reset: () => void;

  /** Idempotent: setting a device to its current state succeeds without logging. */
  setDevicePower: (deviceId: DeviceId, on: boolean, actor: 'human' | 'agent') => ActionResult;
  setThermostat: (targetC: number, actor: 'human' | 'agent') => ActionResult;

  /** Destructive actions: returns a promise resolved by the visible confirm card. */
  requestDestructive: (action: ConfirmationAction, actor: 'human' | 'agent') => Promise<'confirmed' | 'rejected'>;
  confirmPending: () => void;
  rejectPending: () => void;

  logEvent: (kind: HouseEvent['kind'], text: string) => void;
  logToolCall: (record: Omit<ToolCallRecord, 't'>) => void;
  setMcpStatus: (status: McpStatus, detail: string) => void;

  getHouse: () => HouseState;
}

export const useHouse = create<HomeGuardStore>((set, get) => ({
  house: createInitialHouse(),
  pendingConfirmation: null,
  mcpStatus: 'registering',
  mcpDetail: '正在检测 WebMCP 支持…',

  startExercise: () => {
    const { house } = get();
    if (house.scenario.phase !== 'idle') return;
    set((s) => ({
      house: {
        ...s.house,
        scenario: { ...s.house.scenario, phase: 'active' },
        events: [...s.house.events, { t: 0, kind: 'system', text: '⏱ 演习开始。房屋状态进入实时监控。' }],
      },
    }));
  },

  tickOnce: (dtSec) => {
    const { house } = get();
    if (house.scenario.phase !== 'active') return;
    // Deep-enough copy: engine mutates the draft, we swap it in afterwards.
    const draft: HouseState = {
      ...house,
      rooms: {
        kitchen: { ...house.rooms.kitchen },
        living_room: { ...house.rooms.living_room },
      },
      devices: Object.fromEntries(
        Object.entries(house.devices).map(([k, v]) => [k, { ...v }]),
      ) as HouseState['devices'],
      scenario: { ...house.scenario },
    };
    const { events } = tick(draft, dtSec);
    set((s) => ({
      house: {
        ...draft,
        events: [...s.house.events, ...events],
      },
    }));
  },

  reset: () => set({ house: createInitialHouse(), pendingConfirmation: null }),

  setDevicePower: (deviceId, on, actor) => {
    const { house } = get();
    const phaseError = phaseGateError(house.scenario.phase);
    if (phaseError) return { ok: false, message: phaseError };

    const device = house.devices[deviceId];
    if (!device) {
      return { ok: false, message: `未找到设备 "${deviceId}"。可用设备：${Object.keys(house.devices).join(', ')}。` };
    }
    if (!device.toggleable) {
      return {
        ok: false,
        message: `"${device.name}" 不支持直接开关。总水阀请用 shut_off_main_valve，总电闸请用 kill_main_breaker。`,
      };
    }
    if (on && house.scenario.breakerOff && MAINS_POWERED_DEVICES.includes(deviceId)) {
      return {
        ok: false,
        message: `总电闸已拉下，"${device.name}" 所在市电回路无电，无法开启。请先恢复供电（本演习不模拟合闸）。`,
      };
    }
    // Idempotent: no state change, no log entry when the target state holds.
    if (device.on === on) {
      return { ok: true, message: `${device.name} 已经是${on ? '开启' : '关闭'}状态。` };
    }
    set((s) => ({
      house: {
        ...s.house,
        devices: { ...s.house.devices, [deviceId]: { ...device, on } },
        events: [
          ...s.house.events,
          {
            t: s.house.scenario.elapsed,
            kind: actor,
            text: `${actor === 'agent' ? '🤖 智能体' : '👆 用户'}将「${device.name}」${on ? '开启' : '关闭'}。`,
          },
        ],
      },
    }));
    return { ok: true, message: `${device.name} 已${on ? '开启' : '关闭'}。` };
  },

  setThermostat: (targetC, actor) => {
    const { house } = get();
    const phaseError = phaseGateError(house.scenario.phase);
    if (phaseError) return { ok: false, message: phaseError };

    if (!Number.isFinite(targetC) || targetC < 16 || targetC > 30) {
      return { ok: false, message: '目标温度必须在 16–30°C 之间，请修正后重试。' };
    }
    if (house.scenario.breakerOff) {
      return { ok: false, message: '总电闸已拉下，温控器离线，无法设定温度。' };
    }
    set((s) => ({
      house: {
        ...s.house,
        scenario: { ...s.house.scenario, thermostatTargetC: targetC },
        events: [
          ...s.house.events,
          {
            t: s.house.scenario.elapsed,
            kind: actor,
            text: `${actor === 'agent' ? '🤖 智能体' : '👆 用户'}将温控目标设为 ${targetC}°C。`,
          },
        ],
      },
    }));
    return { ok: true, message: `温控目标已设为 ${targetC}°C。` };
  },

  requestDestructive: (action, actor) => {
    // Hard boundary: destructive actions only exist during an active exercise.
    const phaseError = phaseGateError(get().house.scenario.phase);
    if (phaseError) return Promise.reject(new Error(phaseError));
    // Only one confirmation card can be visible at a time; a second request
    // while one is pending would orphan the first caller's promise forever.
    if (get().pendingConfirmation) {
      return Promise.resolve('rejected');
    }
    return new Promise((resolve) => {
      const label = action === 'shut_off_main_valve' ? '关闭总水阀' : '拉下总电闸';
      set((s) => ({
        pendingConfirmation: { action, actor, resolve },
        house: {
          ...s.house,
          events: [
            ...s.house.events,
            { t: s.house.scenario.elapsed, kind: actor === 'agent' ? 'agent' : 'human', text: `⚠️ 请求${label}，等待用户确认。` },
          ],
        },
      }));
    });
  },

  confirmPending: () => {
    const pending = get().pendingConfirmation;
    if (!pending) return;
    const { house } = get();
    const now = house.scenario.elapsed;
    if (pending.action === 'shut_off_main_valve') {
      set((s) => ({
        pendingConfirmation: null,
        house: {
          ...s.house,
          scenario: { ...s.house.scenario, valveShut: true },
          devices: { ...s.house.devices, main_valve: { ...s.house.devices.main_valve, on: false } },
          events: [...s.house.events, { t: now, kind: 'system', text: '🚿 总水阀已关闭，供水切断，漏水停止。' }],
        },
      }));
    } else {
      // Atomic update: the tool result must be true the instant it resolves.
      // Every mains-powered device goes down and the fridge penalty applies
      // exactly once, here — not on a later tick.
      const devices = { ...house.devices };
      devices.main_breaker = { ...devices.main_breaker, on: false };
      for (const id of MAINS_POWERED_DEVICES) {
        devices[id] = { ...devices[id], on: false };
      }
      set((s) => ({
        pendingConfirmation: null,
        house: {
          ...s.house,
          devices,
          scenario: {
            ...s.house.scenario,
            breakerOff: true,
            damageScore: s.house.scenario.damageScore + SPOILED_FOOD_PENALTY,
          },
          events: [
            ...s.house.events,
            {
              t: now,
              kind: 'system',
              text: `⚡ 总电闸已拉下：全屋断电，冰箱等市电设备全部停止（食材报废，损失 +${SPOILED_FOOD_PENALTY} 分）。`,
            },
          ],
        },
      }));
    }
    pending.resolve('confirmed');
  },

  rejectPending: () => {
    const pending = get().pendingConfirmation;
    if (!pending) return;
    const label = pending.action === 'shut_off_main_valve' ? '关闭总水阀' : '拉下总电闸';
    set((s) => ({
      pendingConfirmation: null,
      house: {
        ...s.house,
        events: [...s.house.events, { t: s.house.scenario.elapsed, kind: 'system', text: `🚫 用户拒绝了「${label}」。` }],
      },
    }));
    pending.resolve('rejected');
  },

  logEvent: (kind, text) => {
    set((s) => ({
      house: { ...s.house, events: [...s.house.events, { t: s.house.scenario.elapsed, kind, text }] },
    }));
  },

  logToolCall: (record) => {
    set((s) => ({
      house: {
        ...s.house,
        toolCalls: [...s.house.toolCalls, { ...record, t: s.house.scenario.elapsed }],
      },
    }));
  },

  setMcpStatus: (mcpStatus, mcpDetail) => set({ mcpStatus, mcpDetail }),

  getHouse: () => get().house,
}));

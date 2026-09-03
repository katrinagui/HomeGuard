// Single Zustand store shared by the UI and the WebMCP tool handlers.
// Every mutation goes through an action here so that human clicks and
// agent tool calls produce identical state transitions and log entries.
// The store is the final authority: phase gates and breaker constraints
// are enforced here, not only in the UI.
//
// Language split: ActionResult messages and tool-call details that reach the
// agent are English (the agent contract); events destined for the event log
// carry localized Msg objects — see src/i18n.

import { create } from 'zustand';
import type { DeviceId, HouseEvent, HouseState, ToolCallRecord } from './sim/house';
import { createInitialHouse, MAINS_POWERED_DEVICES, SPOILED_FOOD_PENALTY, SCENARIOS, type ScenarioId } from './sim/house';
import { tick } from './sim/engine';
import type { Msg } from './i18n';

export type ConfirmationAction = 'shut_off_main_valve' | 'kill_main_breaker';

/**
 * A destructive request dies on its own after this long, even if the caller
 * never aborts and the user never decides — the confirmation card must not
 * stay actionable forever. 20 s so the business expiry always fires before
 * an in-browser agent channel's own ~27 s timeout.
 */
export const CONFIRMATION_TIMEOUT_MS = 20_000;

const DESTRUCTIVE_LABELS: Record<ConfirmationAction, { zh: string; en: string }> = {
  shut_off_main_valve: { zh: '关闭总水阀', en: 'Shut off main valve' },
  kill_main_breaker: { zh: '拉下总电闸', en: 'Kill main breaker' },
};

export interface PendingConfirmation {
  /** correlation id for this confirmation round-trip */
  id: string;
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
  if (phase === 'idle') return 'The drill has not started yet. Click "Start the drill" on the page first.';
  if (phase === 'resolved') return 'The drill is over — tools are read-only for review now.';
  return null;
}

interface HomeGuardStore {
  house: HouseState;
  pendingConfirmation: PendingConfirmation | null;
  mcpStatus: McpStatus;
  mcpDetail: string | Msg;

  startExercise: (scenarioId?: ScenarioId) => void;
  tickOnce: (dtSec: number) => void;
  reset: () => void;

  /** Idempotent: setting a device to its current state succeeds without logging. */
  setDevicePower: (deviceId: DeviceId, on: boolean, actor: 'human' | 'agent') => ActionResult;
  setThermostat: (targetC: number, actor: 'human' | 'agent') => ActionResult;

  /** Destructive actions: returns a promise resolved by the visible confirm card,
   *  or 'expired' when the request outlives CONFIRMATION_TIMEOUT_MS. */
  requestDestructive: (action: ConfirmationAction, actor: 'human' | 'agent') => Promise<'confirmed' | 'rejected' | 'expired'>;
  confirmPending: () => void;
  rejectPending: () => void;

  logEvent: (kind: HouseEvent['kind'], msg: Msg) => void;
  logToolCall: (record: Omit<ToolCallRecord, 't'>) => void;
  setMcpStatus: (status: McpStatus, detail: string | Msg) => void;

  getHouse: () => HouseState;
}

export const useHouse = create<HomeGuardStore>((set, get) => ({
  house: createInitialHouse(),
  pendingConfirmation: null,
  mcpStatus: 'registering',
  mcpDetail: 'Detecting WebMCP support…',

  startExercise: (scenarioId: ScenarioId = 'kitchen_leak') => {
    const { house } = get();
    if (house.scenario.phase !== 'idle') return;
    // Idle-phase mutations are phase-gated to read-only, so the state is
    // still pristine — rebuild it fresh with the chosen scenario.
    const fresh = createInitialHouse(scenarioId);
    fresh.scenario.phase = 'active';
    fresh.events.push({
      t: 0,
      kind: 'system',
      msg: {
        key: 'event.start',
        params: { scenarioZh: SCENARIOS[scenarioId].zh, scenarioEn: SCENARIOS[scenarioId].en },
      },
    });
    set({ house: fresh });
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
      return {
        ok: false,
        message: `Device "${deviceId}" not found. Available devices: ${Object.keys(house.devices).join(', ')}.`,
      };
    }
    if (!device.toggleable) {
      return {
        ok: false,
        message: `"${device.name}" cannot be toggled directly. Use shut_off_main_valve for the main valve, or kill_main_breaker for the main breaker.`,
      };
    }
    if (on && house.scenario.breakerOff && MAINS_POWERED_DEVICES.includes(deviceId)) {
      return {
        ok: false,
        message: `The main breaker is off — "${device.name}" is on a mains circuit and cannot be turned on.`,
      };
    }
    // Idempotent: no state change, no log entry when the target state holds.
    if (device.on === on) {
      return { ok: true, message: `${device.name} is already ${on ? 'on' : 'off'}.` };
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
            msg: { key: on ? 'event.deviceOn' : 'event.deviceOff', params: { nameZh: device.nameZh, nameEn: device.name } },
          },
        ],
      },
    }));
    return { ok: true, message: `${device.name} turned ${on ? 'on' : 'off'}.` };
  },

  setThermostat: (targetC, actor) => {
    const { house } = get();
    const phaseError = phaseGateError(house.scenario.phase);
    if (phaseError) return { ok: false, message: phaseError };

    if (!Number.isFinite(targetC) || targetC < 16 || targetC > 30) {
      return { ok: false, message: 'Target temperature must be between 16 and 30°C.' };
    }
    if (house.scenario.breakerOff) {
      return { ok: false, message: 'The main breaker is off — the thermostat is offline.' };
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
            msg: { key: 'event.thermostat', params: { targetC } },
          },
        ],
      },
    }));
    return { ok: true, message: `Thermostat target set to ${targetC}°C.` };
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
      const id = Math.random().toString(36).slice(2, 10);
      const labels = DESTRUCTIVE_LABELS[action];
      set((s) => ({
        pendingConfirmation: { id, action, actor, resolve },
        house: {
          ...s.house,
          events: [
            ...s.house.events,
            {
              t: s.house.scenario.elapsed,
              kind: actor,
              msg: { key: 'event.request', params: { labelZh: labels.zh, labelEn: labels.en } },
            },
          ],
        },
      }));
      // Independent expiry: the card must never stay actionable after the
      // caller's own channel has timed out (or never aborts, polyfill-style).
      setTimeout(() => {
        const pending = get().pendingConfirmation;
        if (!pending || pending.id !== id) return;
        set((s) => ({
          pendingConfirmation: null,
          house: {
            ...s.house,
            events: [
              ...s.house.events,
              {
                t: s.house.scenario.elapsed,
                kind: 'system',
                msg: { key: 'event.confirmExpired', params: { seconds: Math.round(CONFIRMATION_TIMEOUT_MS / 1000) } },
              },
            ],
          },
        }));
        resolve('expired');
      }, CONFIRMATION_TIMEOUT_MS);
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
          events: [...s.house.events, { t: now, kind: 'system', msg: { key: 'event.valveShut' } }],
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
              msg: { key: 'event.breakerOff', params: { penalty: SPOILED_FOOD_PENALTY } },
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
    const labels = DESTRUCTIVE_LABELS[pending.action];
    set((s) => ({
      pendingConfirmation: null,
      house: {
        ...s.house,
        events: [
          ...s.house.events,
          {
            t: s.house.scenario.elapsed,
            kind: 'system',
            msg: { key: 'event.rejected', params: { labelZh: labels.zh, labelEn: labels.en } },
          },
        ],
      },
    }));
    pending.resolve('rejected');
  },

  logEvent: (kind, msg) => {
    set((s) => ({
      house: { ...s.house, events: [...s.house.events, { t: s.house.scenario.elapsed, kind, msg }] },
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

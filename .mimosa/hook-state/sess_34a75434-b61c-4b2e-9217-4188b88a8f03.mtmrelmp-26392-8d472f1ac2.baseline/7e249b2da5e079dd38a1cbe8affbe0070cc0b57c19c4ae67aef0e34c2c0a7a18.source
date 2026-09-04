// The 6 registered WebMCP tools. Tool handlers are thin wrappers over store
// actions: same code path as the UI buttons, so agent and human actions are
// indistinguishable in state and logs.
//
// Everything the agent sees (descriptions, schemas, return values, errors) is
// English by contract — a stable language for tool routing. Tool-call records
// shown to humans in the debrief carry localized Msg objects where needed.

import { useHouse } from '../store';
import type { DeviceId, HouseState } from '../sim/house';
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

/** Scenario-aware fault list the agent should act on. */
function collectActiveFaults(house: HouseState): string[] {
  const faults: string[] = [];
  const s = house.scenario;
  if (s.id === 'kitchen_leak' && s.leakActive && !s.valveShut) {
    faults.push('Kitchen supply pipe burst, standing water rising. Shut the main valve (shut_off_main_valve).');
  }
  if (s.id === 'heater_runaway' && s.heaterActive && house.devices.thermostat.on) {
    faults.push(
      'Central thermostat relay welded closed, room temperature rising fast. Power the thermostat down ' +
        '(set_device_power deviceId="thermostat" on=false).',
    );
  }
  return faults;
}

export function buildTools(): ToolDefinition[] {
  return [
    {
      name: 'get_house_status',
      title: 'Read house status',
      description:
        'Read the full real-time state of the smart home: per-room temperature, humidity and standing water, ' +
        'every device with its power state, active emergencies, and the accumulated damage score. ' +
        'Call this before diagnosing anything.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: () => {
        const { house } = useHouse.getState();
        useHouse.getState().logToolCall({
          tool: 'get_house_status',
          input: {},
          outcome: 'ok',
          detail: { key: 'tl.status', params: { score: Math.round(house.scenario.damageScore) } },
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
          activeFaults: collectActiveFaults(house),
        };
      },
    },
    {
      name: 'get_device_log',
      title: 'Read device log',
      description:
        'Read the event log of one device, including historical readings and fault records. ' +
        'When get_house_status reports an anomaly, use this to pinpoint the cause.',
      inputSchema: {
        type: 'object',
        properties: {
          deviceId: {
            type: 'string',
            description: 'Device ID, e.g. main_valve, kitchen_fridge, main_breaker',
          },
        },
        required: ['deviceId'],
      },
      annotations: { readOnlyHint: true },
      execute: (input) => {
        if (typeof input.deviceId !== 'string' || input.deviceId === '') {
          const message = 'Parameter "deviceId" is required (a device ID string).';
          useHouse.getState().logToolCall({
            tool: 'get_device_log',
            input,
            outcome: 'error',
            detail: message,
            actor: 'agent',
          });
          throw new Error(message);
        }
        const deviceId = input.deviceId;
        const house = useHouse.getState().house;
        if (!(deviceId in house.devices)) {
          const message = `Device "${deviceId}" not found. Available devices: ${Object.keys(house.devices).join(', ')}.`;
          useHouse.getState().logToolCall({
            tool: 'get_device_log',
            input,
            outcome: 'error',
            detail: message,
            actor: 'agent',
          });
          throw new Error(message);
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
      title: 'Set device power',
      description:
        'Set a regular device (lights, robot vacuum, thermostat, smart lock) to an explicit power state. ' +
        'Idempotent: setting the same state twice has no side effects. ' +
        'Not for the main valve or breaker — use shut_off_main_valve or kill_main_breaker.',
      inputSchema: {
        type: 'object',
        properties: {
          deviceId: {
            type: 'string',
            description: 'Device to act on',
            enum: [...SETTABLE_DEVICE_IDS],
          },
          on: {
            type: 'boolean',
            description: 'Target power state: true = on, false = off (required)',
          },
        },
        required: ['deviceId', 'on'],
      },
      execute: (input) => {
        // Strict runtime validation: the WebMCP runtime does not validate the
        // JSON Schema for the page, so no coercion ever happens here.
        if (typeof input.on !== 'boolean') {
          const received = input.on === undefined ? 'missing' : JSON.stringify(input.on) ?? String(input.on);
          throw new Error(
            `Parameter "on" is required and must be a boolean (true or false). Received: ${received}. No state was changed.`,
          );
        }
        if (typeof input.deviceId !== 'string' || input.deviceId === '') {
          throw new Error('Parameter "deviceId" is required (a device ID string).');
        }
        const deviceId = input.deviceId as DeviceId;
        const on = input.on;
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
      title: 'Set thermostat target',
      description: 'Set the target temperature of the central thermostat (16–30°C). Room temperatures drift toward the target.',
      inputSchema: {
        type: 'object',
        properties: {
          targetC: { type: 'number', description: 'Target temperature in °C, between 16 and 30' },
        },
        required: ['targetC'],
      },
      execute: (input) => {
        // Strict runtime validation: reject strings like "20" instead of coercing.
        if (typeof input.targetC !== 'number' || !Number.isFinite(input.targetC)) {
          const received = input.targetC === undefined ? 'missing' : JSON.stringify(input.targetC) ?? String(input.targetC);
          throw new Error(
            `Parameter "targetC" is required and must be a number between 16 and 30. Received: ${received}. No state was changed.`,
          );
        }
        const targetC = input.targetC;
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
      title: 'Shut off the main valve (destructive)',
      description:
        '[Destructive — requires explicit user confirmation on the page] Shut the whole-home main valve to stop the ' +
        'kitchen leak immediately. Side effects: the entire home loses water; running washing machines and dishwashers ' +
        'stop. This is the only way to stop the water.',
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
        if (outcome === 'expired') {
          useHouse.getState().logToolCall({
            tool: 'shut_off_main_valve',
            input: {},
            outcome: 'expired',
            detail: { key: 'tl.expired' },
            actor: 'agent',
          });
          throw new Error('The confirmation request expired before the user decided. Call the tool again to raise a fresh confirmation card.');
        }
        if (outcome !== 'confirmed') {
          useHouse.getState().logToolCall({
            tool: 'shut_off_main_valve',
            input: {},
            outcome: 'rejected',
            detail: { key: 'tl.rejected' },
            actor: 'agent',
          });
          return 'The user rejected shutting the main valve. Explain the urgency, but do not retry without new information.';
        }
        useHouse.getState().logToolCall({
          tool: 'shut_off_main_valve',
          input: {},
          outcome: 'ok',
          detail: { key: 'tl.approved' },
          actor: 'agent',
        });
        return 'Main valve shut. Water supply is cut and the kitchen leak has stopped; standing water will drain.';
      },
    },
    {
      name: 'kill_main_breaker',
      title: 'Kill the main breaker (destructive)',
      description:
        '[Destructive — requires explicit user confirmation on the page] Open the main breaker and cut all power. ' +
        'Side effects: every mains-powered device goes down at once — the fridge stops and its food spoils (+120 damage). ' +
        'Only use when cutting power is genuinely the right call.',
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
        if (outcome === 'expired') {
          useHouse.getState().logToolCall({
            tool: 'kill_main_breaker',
            input: {},
            outcome: 'expired',
            detail: { key: 'tl.expired' },
            actor: 'agent',
          });
          throw new Error('The confirmation request expired before the user decided. Call the tool again to raise a fresh confirmation card.');
        }
        if (outcome !== 'confirmed') {
          useHouse.getState().logToolCall({
            tool: 'kill_main_breaker',
            input: {},
            outcome: 'rejected',
            detail: { key: 'tl.rejected' },
            actor: 'agent',
          });
          return 'The user rejected killing the main breaker. Ask about their concerns before deciding next steps.';
        }
        useHouse.getState().logToolCall({
          tool: 'kill_main_breaker',
          input: {},
          outcome: 'ok',
          detail: { key: 'tl.breakerApproved' },
          actor: 'agent',
        });
        return 'Main breaker off. All mains devices are down — note the fridge is off and its food will spoil.';
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
  if (house.scenario.phase === 'idle') return 'The drill has not started yet. Ask the user to click "Start the drill" on the page first.';
  if (house.scenario.phase === 'resolved') return 'The drill is over — tools are read-only for review now.';
  if (action === 'shut_off_main_valve' && house.scenario.valveShut) {
    return 'The main valve is already shut. No need to repeat.';
  }
  if (action === 'kill_main_breaker' && house.scenario.breakerOff) {
    return 'The main breaker is already off. No need to repeat.';
  }
  if (pendingConfirmation) {
    return `Another action ("${pendingConfirmation.action}") is awaiting user confirmation. Wait for the user to decide first.`;
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
  promise: Promise<'confirmed' | 'rejected' | 'expired'>,
  signal?: AbortSignal,
): Promise<'confirmed' | 'rejected' | 'expired'> {
  if (!signal) return promise;
  if (signal.aborted) {
    useHouse.getState().rejectPending();
    return Promise.reject(new Error('Tool call cancelled.'));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      // Clear the card if it is still waiting; harmless if already resolved.
      useHouse.getState().rejectPending();
      reject(new Error('Tool call cancelled.'));
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

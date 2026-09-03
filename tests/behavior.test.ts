// Minimal behavior tests for the paths most likely to break the demo.
// The store is the final authority, so testing store actions + tool handlers
// covers both human clicks and agent tool calls.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIRMATION_TIMEOUT_MS, useHouse } from '../src/store';
import { buildTools } from '../src/mcp/tools';
import { MAINS_POWERED_DEVICES, SPOILED_FOOD_PENALTY } from '../src/sim/house';
import type { ToolDefinition } from '../src/mcp/tools';

function tool(name: string): ToolDefinition {
  const t = buildTools().find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return t;
}

/** Drive the exercise from start to resolved through the real store/engine path. */
function runToResolved() {
  const store = useHouse.getState();
  store.startExercise();
  store.tickOnce(9); // leak triggers, ~5cm of water
  void store.requestDestructive('shut_off_main_valve', 'human');
  store.confirmPending();
  for (let i = 0; i < 60 && useHouse.getState().house.scenario.phase !== 'resolved'; i += 1) {
    store.tickOnce(1);
  }
}

beforeEach(() => {
  useHouse.getState().reset();
});

describe('set_device_power idempotency (P0-02)', () => {
  it('keeps the device on across repeated on:true calls without duplicate events', () => {
    const store = useHouse.getState();
    store.startExercise();
    const first = store.setDevicePower('kitchen_light', true, 'agent');
    expect(first.ok).toBe(true);
    const eventsAfterFirst = useHouse.getState().house.events.length;
    const second = store.setDevicePower('kitchen_light', true, 'agent');
    expect(second.ok).toBe(true);
    expect(useHouse.getState().house.devices.kitchen_light.on).toBe(true);
    expect(useHouse.getState().house.events.length).toBe(eventsAfterFirst);
  });

  it('keeps the device off across repeated on:false calls', () => {
    const store = useHouse.getState();
    store.startExercise();
    store.setDevicePower('living_room_light', false, 'agent');
    store.setDevicePower('living_room_light', false, 'agent');
    expect(useHouse.getState().house.devices.living_room_light.on).toBe(false);
  });

  it('rejects unknown devices without changing anything', () => {
    const store = useHouse.getState();
    store.startExercise();
    const before = useHouse.getState().house;
    const result = store.setDevicePower('nonexistent' as never, true, 'agent');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('not found');
    expect(useHouse.getState().house).toBe(before);
  });

  it('the tool handler surfaces the target state contract', async () => {
    const store = useHouse.getState();
    store.startExercise();
    await tool('set_device_power').execute({ deviceId: 'kitchen_light', on: true });
    await tool('set_device_power').execute({ deviceId: 'kitchen_light', on: true });
    expect(useHouse.getState().house.devices.kitchen_light.on).toBe(true);
  });
});

describe('main breaker atomicity (P0-03)', () => {
  it('shuts down every mains device at once and applies the fridge penalty exactly once', () => {
    const store = useHouse.getState();
    store.startExercise();
    // Kill the breaker before the leak triggers so no standing-water damage
    // accrues; the fridge penalty is then the only source of loss.
    void store.requestDestructive('kill_main_breaker', 'agent');
    store.confirmPending();

    const state = useHouse.getState().house;
    expect(state.scenario.breakerOff).toBe(true);
    expect(state.devices.main_breaker.on).toBe(false);
    for (const id of MAINS_POWERED_DEVICES) {
      expect(state.devices[id].on).toBe(false);
    }
    expect(state.scenario.damageScore).toBe(SPOILED_FOOD_PENALTY);
    // tick away: no second fridge penalty may appear
    store.tickOnce(5);
    expect(useHouse.getState().house.scenario.damageScore).toBe(SPOILED_FOOD_PENALTY);
  });

  it('refuses to re-enable mains devices while the breaker is off', () => {
    const store = useHouse.getState();
    store.startExercise();
    void store.requestDestructive('kill_main_breaker', 'human');
    store.confirmPending();
    const result = store.setDevicePower('thermostat', true, 'agent');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('cannot be turned on');
    expect(useHouse.getState().house.devices.thermostat.on).toBe(false);
  });
});

describe('phase gating (P0-04)', () => {
  it('blocks mutations before the exercise starts and explains how to proceed', async () => {
    const store = useHouse.getState();
    const power = store.setDevicePower('kitchen_light', true, 'agent');
    expect(power.ok).toBe(false);
    expect(power.message).toContain('has not started yet');
    const thermo = store.setThermostat(24, 'agent');
    expect(thermo.ok).toBe(false);
    expect(thermo.message).toContain('has not started yet');
    await expect(store.requestDestructive('shut_off_main_valve', 'agent')).rejects.toThrow('has not started yet');
    await expect(
      tool('shut_off_main_valve').execute({}, {}),
    ).rejects.toThrow('has not started yet');
  });

  it('blocks mutations after the exercise is resolved', async () => {
    runToResolved();
    const store = useHouse.getState();
    expect(useHouse.getState().house.scenario.phase).toBe('resolved');
    const power = store.setDevicePower('kitchen_light', true, 'agent');
    expect(power.ok).toBe(false);
    expect(power.message).toContain('drill is over');
    // set_device_power throws synchronously
    expect(() => tool('set_device_power').execute({ deviceId: 'kitchen_light', on: true }, {})).toThrow(
      'drill is over',
    );
  });

  it('still allows the full diagnosis path during the active phase', async () => {
    const store = useHouse.getState();
    store.startExercise();
    store.tickOnce(9);
    const status = await tool('get_house_status').execute({}, {});
    expect(status).toMatchObject({ phase: 'active' });
    const log = await tool('get_device_log').execute({ deviceId: 'main_valve' }, {});
    expect(JSON.stringify(log)).toContain('burst');
  });
});

describe('strict parameter validation (R1)', () => {
  it('rejects on:"false" instead of coercing it to true', () => {
    const store = useHouse.getState();
    store.startExercise();
    // smart_lock starts ON; the invalid call must leave it exactly as it was
    expect(() =>
      tool('set_device_power').execute({ deviceId: 'smart_lock', on: 'false' }, {}),
    ).toThrow('must be a boolean');
    expect(useHouse.getState().house.devices.smart_lock.on).toBe(true);
  });

  it('rejects a missing on without touching the device', () => {
    const store = useHouse.getState();
    store.startExercise();
    expect(() =>
      tool('set_device_power').execute({ deviceId: 'smart_lock' }, {}),
    ).toThrow('must be a boolean');
    expect(useHouse.getState().house.devices.smart_lock.on).toBe(true);
  });

  it('rejects targetC:"20" as a string instead of coercing', () => {
    const store = useHouse.getState();
    store.startExercise();
    expect(() => tool('set_thermostat').execute({ targetC: '20' }, {})).toThrow('must be a number');
    expect(useHouse.getState().house.scenario.thermostatTargetC).toBe(22);
  });

  it('rejects a missing targetC', () => {
    const store = useHouse.getState();
    store.startExercise();
    expect(() => tool('set_thermostat').execute({}, {})).toThrow('must be a number');
    expect(useHouse.getState().house.scenario.thermostatTargetC).toBe(22);
  });
});

describe('confirmation expiry (R1)', () => {
  it('expires the request, clears the card, and changes nothing', async () => {
    vi.useFakeTimers();
    try {
      const store = useHouse.getState();
      store.startExercise();
      const promise = store.requestDestructive('shut_off_main_valve', 'agent');
      const advance = vi.advanceTimersByTimeAsync(CONFIRMATION_TIMEOUT_MS);
      await expect(promise).resolves.toBe('expired');
      await advance;
      expect(useHouse.getState().pendingConfirmation).toBeNull();
      expect(useHouse.getState().house.scenario.valveShut).toBe(false);
      expect(useHouse.getState().house.devices.main_valve.on).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('surfaces expiry to the agent as a corrective error, not a fake rejection', async () => {
    vi.useFakeTimers();
    try {
      const store = useHouse.getState();
      store.startExercise();
      const promise = tool('shut_off_main_valve').execute({}, {});
      const advance = vi.advanceTimersByTimeAsync(CONFIRMATION_TIMEOUT_MS);
      await expect(promise).rejects.toThrow('expired');
      await advance;
      const calls = useHouse.getState().house.toolCalls;
      expect(calls[calls.length - 1].outcome).toBe('expired');
      expect(useHouse.getState().house.scenario.valveShut).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a user decision after expiry is a no-op (request id mismatch)', async () => {
    vi.useFakeTimers();
    try {
      const store = useHouse.getState();
      store.startExercise();
      const promise = store.requestDestructive('shut_off_main_valve', 'agent');
      await vi.advanceTimersByTimeAsync(CONFIRMATION_TIMEOUT_MS);
      await expect(promise).resolves.toBe('expired');
      store.confirmPending(); // stale card must not act
      expect(useHouse.getState().house.scenario.valveShut).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('water and valve behavior (P0-04 regression)', () => {
  it('stops the rise once the valve is shut and drains to resolution', () => {
    const store = useHouse.getState();
    store.startExercise();
    store.tickOnce(9);
    const rising = useHouse.getState().house.rooms.kitchen.waterLevelCm;
    expect(rising).toBeGreaterThan(0);

    void store.requestDestructive('shut_off_main_valve', 'human');
    store.confirmPending();
    const w0 = useHouse.getState().house.rooms.kitchen.waterLevelCm;
    store.tickOnce(2);
    const w1 = useHouse.getState().house.rooms.kitchen.waterLevelCm;
    expect(w1).toBeLessThan(w0);
    expect(w1).toBeGreaterThan(0);

    for (let i = 0; i < 60 && useHouse.getState().house.scenario.phase !== 'resolved'; i += 1) {
      store.tickOnce(1);
    }
    expect(useHouse.getState().house.scenario.phase).toBe('resolved');
    expect(useHouse.getState().house.rooms.kitchen.waterLevelCm).toBe(0);
  });
});

describe('heater runaway scenario', () => {
  it('runs end to end using only the existing tools', async () => {
    const store = useHouse.getState();
    store.startExercise('heater_runaway');
    store.tickOnce(9);
    const status = (await tool('get_house_status').execute({}, {})) as { activeFaults: string[] };
    expect(status.activeFaults.join(' ')).toContain('thermostat');

    const d0 = useHouse.getState().house.scenario.damageScore;
    store.tickOnce(2);
    expect(useHouse.getState().house.scenario.damageScore).toBeGreaterThan(d0);

    // the fix uses the same generic tool the leak scenario uses
    await tool('set_device_power').execute({ deviceId: 'thermostat', on: false }, {});
    expect(useHouse.getState().house.devices.thermostat.on).toBe(false);

    for (let i = 0; i < 90 && useHouse.getState().house.scenario.phase !== 'resolved'; i += 1) {
      store.tickOnce(1);
    }
    expect(useHouse.getState().house.scenario.phase).toBe('resolved');
  });

  it('keeps burning until the thermostat is powered down', () => {
    const store = useHouse.getState();
    store.startExercise('heater_runaway');
    for (let i = 0; i < 30; i += 1) store.tickOnce(1);
    expect(useHouse.getState().house.scenario.phase).toBe('active');
  });

  it('defaults to the kitchen leak scenario', async () => {
    const store = useHouse.getState();
    store.startExercise();
    store.tickOnce(9);
    const status = (await tool('get_house_status').execute({}, {})) as { activeFaults: string[] };
    expect(status.activeFaults.join(' ')).toContain('main valve');
  });

  it('stops advertising the fault once resolved (P0-01 regression)', async () => {
    const store = useHouse.getState();
    store.startExercise('heater_runaway');
    store.tickOnce(9);
    await tool('set_device_power').execute({ deviceId: 'thermostat', on: false }, {});
    for (let i = 0; i < 90 && useHouse.getState().house.scenario.phase !== 'resolved'; i += 1) {
      store.tickOnce(1);
    }
    expect(useHouse.getState().house.scenario.phase).toBe('resolved');
    const status = (await tool('get_house_status').execute({}, {})) as { activeFaults: string[] };
    expect(status.activeFaults).toEqual([]);
  });

  it('rejects unknown and missing deviceId by throwing (consistent error semantics)', () => {
    const store = useHouse.getState();
    store.startExercise();
    // get_device_log throws synchronously
    expect(() => tool('get_device_log').execute({ deviceId: 'nope' }, {})).toThrow('not found');
    expect(() => tool('get_device_log').execute({}, {})).toThrow('deviceId');
    const last = useHouse.getState().house.toolCalls.at(-1);
    expect(last.outcome).toBe('error');
  });
});

describe('confirmation flow (P0-04 / cancellation)', () => {
  it('user rejection leaves the state untouched', async () => {
    const store = useHouse.getState();
    store.startExercise();
    const promise = store.requestDestructive('shut_off_main_valve', 'agent');
    expect(useHouse.getState().pendingConfirmation).not.toBeNull();
    store.rejectPending();
    await expect(promise).resolves.toBe('rejected');
    expect(useHouse.getState().house.scenario.valveShut).toBe(false);
    expect(useHouse.getState().house.devices.main_valve.on).toBe(true);
  });

  it('a second destructive request while one is pending resolves rejected, not orphaned', async () => {
    const store = useHouse.getState();
    store.startExercise();
    void store.requestDestructive('shut_off_main_valve', 'agent');
    const second = store.requestDestructive('kill_main_breaker', 'agent');
    await expect(second).resolves.toBe('rejected');
    expect(useHouse.getState().pendingConfirmation?.action).toBe('shut_off_main_valve');
    store.rejectPending();
  });

  it('aborting the tool call clears the confirmation card', async () => {
    const store = useHouse.getState();
    store.startExercise();
    const controller = new AbortController();
    const promise = tool('shut_off_main_valve').execute({}, { signal: controller.signal });
    expect(useHouse.getState().pendingConfirmation?.action).toBe('shut_off_main_valve');
    controller.abort();
    await expect(promise).rejects.toThrow('cancelled');
    expect(useHouse.getState().pendingConfirmation).toBeNull();
  });

  it('tolerates a missing options argument (polyfill does not pass one)', async () => {
    const store = useHouse.getState();
    store.startExercise();
    const promise = tool('shut_off_main_valve').execute({});
    expect(useHouse.getState().pendingConfirmation).not.toBeNull();
    store.confirmPending();
    await expect(promise).resolves.toContain('Main valve shut');
  });
});

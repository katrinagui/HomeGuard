// House domain model — single source of truth for the simulation.
// Tools (mcp/) and UI actions both mutate this state through the store,
// so agent actions and human actions are indistinguishable downstream.
//
// Naming convention: `name` is the canonical English name (agent-facing
// contract), `nameZh` is the Chinese display name (UI). Events carry Msg
// objects (key + params) and are localized at render time — see src/i18n.

import type { Msg } from '../i18n';

export type RoomId = 'kitchen' | 'living_room';

export interface Room {
  id: RoomId;
  name: string;
  nameZh: string;
  temperatureC: number;
  humidityPct: number;
  /** standing water depth in cm; only meaningful where flooding is possible */
  waterLevelCm: number;
}

export type DeviceId =
  | 'main_valve'
  | 'main_breaker'
  | 'kitchen_light'
  | 'kitchen_fridge'
  | 'living_room_light'
  | 'robot_vacuum'
  | 'thermostat'
  | 'smart_lock';

export type DeviceCategory = 'valve' | 'breaker' | 'light' | 'appliance' | 'hvac' | 'lock';

export interface Device {
  id: DeviceId;
  name: string;
  nameZh: string;
  category: DeviceCategory;
  room: RoomId | 'utility';
  on: boolean;
  /** false for main_valve / main_breaker: they are only driven by their dedicated tools */
  toggleable: boolean;
}

export type EventKind = 'sim' | 'human' | 'agent' | 'system';

export interface HouseEvent {
  /** seconds since the exercise started */
  t: number;
  kind: EventKind;
  msg: Msg;
}

export interface ToolCallRecord {
  t: number;
  tool: string;
  input: Record<string, unknown>;
  outcome: 'ok' | 'pending_confirmation' | 'rejected' | 'expired' | 'error';
  /** agent-facing detail is a plain English string; human-facing uses Msg */
  detail: string | Msg;
  actor: 'human' | 'agent';
}

export type ScenarioId = 'kitchen_leak' | 'heater_runaway';

/** Display names for the drill scenarios (event-log params carry both). */
export const SCENARIOS: Record<ScenarioId, { zh: string; en: string }> = {
  kitchen_leak: { zh: '厨房爆管', en: 'Kitchen pipe burst' },
  heater_runaway: { zh: '暖气失控', en: 'Heater runaway' },
};

export interface ScenarioState {
  /** which drill this round runs */
  id: ScenarioId;
  /** elapsed seconds since exercise start; clock only runs while phase === 'active' */
  elapsed: number;
  phase: 'idle' | 'active' | 'resolved';
  /** loss points: standing water, spoiled food, avoidable emergency call, … */
  damageScore: number;
  /** kitchen_leak: true once the burst has been triggered by the tick engine */
  leakActive: boolean;
  /** kitchen_leak: set once the main valve has been shut; water then recedes */
  valveShut: boolean;
  /** heater_runaway: true once the welded relay has been triggered */
  heaterActive: boolean;
  breakerOff: boolean;
  /** target temperature for the central thermostat (°C) */
  thermostatTargetC: number;
}

export interface HouseState {
  rooms: Record<RoomId, Room>;
  devices: Record<DeviceId, Device>;
  events: HouseEvent[];
  toolCalls: ToolCallRecord[];
  scenario: ScenarioState;
}

export const DAMAGE_PER_CM_PER_SEC = 2; // loss points while standing water sits (star thresholds tuned to this)
export const SPOILED_FOOD_PENALTY = 120; // breaker off with fridge loaded
export const LEAK_FLOW_CM_PER_SEC = 0.6; // water rises while valve open
export const DRAIN_CM_PER_SEC = 1.2; // water recedes once valve shut
export const HEAT_RATE_C_PER_SEC = 0.5; // heater_runaway: living room heats while relay welded
export const COOL_RATE_C_PER_SEC = 0.2; // heater_runaway: rooms cool once thermostat is down
export const OVERHEAT_DAMAGE_PER_DEG_PER_SEC = 1.2; // loss points per degree above 24°C

/** Devices that lose power the moment the main breaker is pulled. */
export const MAINS_POWERED_DEVICES: DeviceId[] = [
  'kitchen_light',
  'kitchen_fridge',
  'living_room_light',
  'robot_vacuum',
  'thermostat',
];

export function createInitialHouse(scenarioId: ScenarioId = 'kitchen_leak'): HouseState {
  return {
    rooms: {
      kitchen: { id: 'kitchen', name: 'Kitchen', nameZh: '厨房', temperatureC: 22.5, humidityPct: 48, waterLevelCm: 0 },
      living_room: { id: 'living_room', name: 'Living Room', nameZh: '客厅', temperatureC: 23.0, humidityPct: 45, waterLevelCm: 0 },
    },
    devices: {
      main_valve: { id: 'main_valve', name: 'Main Valve', nameZh: '总水阀', category: 'valve', room: 'utility', on: true, toggleable: false },
      main_breaker: { id: 'main_breaker', name: 'Main Breaker', nameZh: '总电闸', category: 'breaker', room: 'utility', on: true, toggleable: false },
      kitchen_light: { id: 'kitchen_light', name: 'Kitchen Ceiling Light', nameZh: '厨房顶灯', category: 'light', room: 'kitchen', on: false, toggleable: true },
      kitchen_fridge: { id: 'kitchen_fridge', name: 'Refrigerator (main circuit)', nameZh: '冰箱（接在总电闸回路）', category: 'appliance', room: 'kitchen', on: true, toggleable: false },
      living_room_light: { id: 'living_room_light', name: 'Living-Room Floor Lamp', nameZh: '客厅落地灯', category: 'light', room: 'living_room', on: true, toggleable: true },
      robot_vacuum: { id: 'robot_vacuum', name: 'Robot Vacuum', nameZh: '扫地机器人', category: 'appliance', room: 'living_room', on: false, toggleable: true },
      thermostat: { id: 'thermostat', name: 'Central Thermostat', nameZh: '中央温控器', category: 'hvac', room: 'living_room', on: true, toggleable: true },
      smart_lock: { id: 'smart_lock', name: 'Smart Lock', nameZh: '智能门锁', category: 'lock', room: 'utility', on: true, toggleable: true },
    },
    events: [
      { t: 0, kind: 'system', msg: { key: 'event.init' } },
    ],
    toolCalls: [],
    scenario: {
      id: scenarioId,
      elapsed: 0,
      phase: 'idle',
      damageScore: 0,
      leakActive: false,
      valveShut: false,
      heaterActive: false,
      breakerOff: false,
      thermostatTargetC: 22,
    },
  };
}

// Scenario "kitchen_leak": the kitchen supply pipe bursts.
// Diagnosis path the agent is expected to take:
//   get_house_status  -> kitchen water sensor triggered, humidity spiking
//   get_device_log('main_valve') -> abnormal pressure, then burst event
//   shut_off_main_valve (needs user confirmation) -> water stops, then recedes
// Optional missteps that cost points:
//   kill_main_breaker with the fridge on its circuit -> spoiled food penalty
// Resolution: valve shut AND kitchen water level reaches 0.

import type { HouseEvent, HouseState, RoomId } from './house';
import { DRAIN_CM_PER_SEC, LEAK_FLOW_CM_PER_SEC } from './house';

const LEAK_TRIGGER_SECONDS = 8; // grace period after the exercise starts
const LEAK_PRESSURE_LOG_T = 4; // device-log hint appears before the burst

/** Device log lines. Keyed by device, each entry is (t, text). */
export function deviceLogLines(state: HouseState, deviceId: string): Array<{ t: number; text: string }> {
  const s = state.scenario;
  if (deviceId === 'main_valve') {
    const lines: Array<{ t: number; text: string }> = [
      { t: 0, text: '水压 2.4 bar — 正常范围 2.0–2.8 bar' },
    ];
    if (s.phase !== 'idle' && s.elapsed >= LEAK_PRESSURE_LOG_T) {
      lines.push({ t: LEAK_PRESSURE_LOG_T, text: '警告：供水压力升至 3.6 bar，超出安全上限' });
    }
    if (s.leakActive) {
      lines.push({ t: LEAK_TRIGGER_SECONDS, text: '严重故障：厨房供水管爆裂，持续漏水。需要关闭总水阀。' });
    }
    if (s.valveShut) {
      lines.push({ t: s.elapsed, text: '主阀已关闭，供水切断。' });
    }
    return lines;
  }
  if (deviceId === 'kitchen_fridge') {
    const lines = [{ t: 0, text: '压缩机运行正常，冷藏室 4°C' }];
    if (s.breakerOff) {
      lines.push({ t: s.elapsed, text: '断电。冷藏室温控离线，食材处于风险中。' });
    }
    return lines;
  }
  if (deviceId === 'main_breaker') {
    const lines = [{ t: 0, text: '主回路闭合，负载 1.8 kW' }];
    if (s.breakerOff) lines.push({ t: s.elapsed, text: '主回路已断开。' });
    return lines;
  }
  // generic fallback for simple devices
  const dev = state.devices[deviceId as keyof typeof state.devices];
  return [{ t: 0, text: dev ? `${dev.name}：状态 ${dev.on ? '开启' : '关闭'}，无异常记录` : '未找到该设备' }];
}

/** Advance the simulation by dt seconds. Mutates `state` in place and returns new events. */
export function tick(state: HouseState, dt: number): { events: HouseEvent[]; justResolved: boolean } {
  const events: HouseEvent[] = [];
  const s = state.scenario;
  if (s.phase !== 'active') return { events, justResolved: false };

  s.elapsed += dt;

  // Trigger the leak once.
  if (!s.leakActive && s.elapsed >= LEAK_TRIGGER_SECONDS) {
    s.leakActive = true;
    events.push({
      t: s.elapsed,
      kind: 'sim',
      text: '厨房水浸传感器触发：供水管爆裂，积水持续上涨。',
    });
  }

  const kitchen: RoomId = 'kitchen';
  if (s.leakActive && !s.valveShut) {
    state.rooms[kitchen].waterLevelCm = round1(state.rooms[kitchen].waterLevelCm + LEAK_FLOW_CM_PER_SEC * dt);
    state.rooms[kitchen].humidityPct = Math.min(99, state.rooms[kitchen].humidityPct + 4 * dt);
    // Standing water and rising humidity both cost points.
    s.damageScore += state.rooms[kitchen].waterLevelCm * 2 * dt;
  }
  if (s.valveShut) {
    state.rooms[kitchen].waterLevelCm = Math.max(0, round1(state.rooms[kitchen].waterLevelCm - DRAIN_CM_PER_SEC * dt));
    state.rooms[kitchen].humidityPct = Math.max(48, state.rooms[kitchen].humidityPct - 3 * dt);
  }

  // Room temperatures drift slowly toward the thermostat target.
  for (const room of Object.values(state.rooms)) {
    const delta = s.thermostatTargetC - room.temperatureC;
    if (Math.abs(delta) > 0.05) {
      room.temperatureC = round1(room.temperatureC + Math.sign(delta) * Math.min(Math.abs(delta), 0.05 * dt));
    }
  }

  // Fridge penalty is applied once, atomically, by the store when the breaker
  // is pulled. Nothing here may re-enable mains devices while breakerOff.

  if (s.leakActive && s.valveShut && state.rooms[kitchen].waterLevelCm <= 0) {
    s.phase = 'resolved';
    events.push({ t: s.elapsed, kind: 'system', text: '厨房积水已排净，险情解除。' });
    return { events, justResolved: true };
  }

  return { events, justResolved: false };
}

export function starRating(damageScore: number): { stars: number; label: string } {
  if (damageScore < 150) return { stars: 3, label: '金牌管家' };
  if (damageScore < 400) return { stars: 2, label: '合格管家' };
  return { stars: 1, label: '勉强及格' };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

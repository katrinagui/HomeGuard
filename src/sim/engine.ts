// Scenario "kitchen_leak": the kitchen supply pipe bursts.
// Diagnosis path the agent is expected to take:
//   get_house_status  -> kitchen water sensor triggered, humidity spiking
//   get_device_log('main_valve') -> abnormal pressure, then burst event
//   shut_off_main_valve (needs user confirmation) -> water stops, then recedes
// Optional missteps that cost points:
//   kill_main_breaker with the fridge on its circuit -> spoiled food penalty
// Resolution: valve shut AND kitchen water level reaches 0.
//
// Device log lines are agent-facing (get_device_log output) — English only.
// House events are human-facing and carry localized Msg objects.

import type { HouseEvent, HouseState, RoomId } from './house';
import { DAMAGE_PER_CM_PER_SEC, DRAIN_CM_PER_SEC, LEAK_FLOW_CM_PER_SEC } from './house';

const LEAK_TRIGGER_SECONDS = 8; // grace period after the exercise starts
const LEAK_PRESSURE_LOG_T = 4; // device-log hint appears before the burst

/** Device log lines. Keyed by device, each entry is (t, text). English, agent-facing. */
export function deviceLogLines(state: HouseState, deviceId: string): Array<{ t: number; text: string }> {
  const s = state.scenario;
  if (deviceId === 'main_valve') {
    const lines: Array<{ t: number; text: string }> = [
      { t: 0, text: 'Water pressure 2.4 bar — normal range 2.0–2.8 bar' },
    ];
    if (s.phase !== 'idle' && s.elapsed >= LEAK_PRESSURE_LOG_T) {
      lines.push({ t: LEAK_PRESSURE_LOG_T, text: 'WARNING: supply pressure rose to 3.6 bar, above the safe limit' });
    }
    if (s.leakActive) {
      lines.push({ t: LEAK_TRIGGER_SECONDS, text: 'SEVERE FAULT: kitchen supply pipe burst, continuous leak. Shut the main valve.' });
    }
    if (s.valveShut) {
      lines.push({ t: s.elapsed, text: 'Main valve shut. Water supply cut.' });
    }
    return lines;
  }
  if (deviceId === 'kitchen_fridge') {
    const lines = [{ t: 0, text: 'Compressor running normally, fridge compartment 4°C' }];
    if (s.breakerOff) {
      lines.push({ t: s.elapsed, text: 'Power lost. Thermostat offline; food at risk.' });
    }
    return lines;
  }
  if (deviceId === 'main_breaker') {
    const lines = [{ t: 0, text: 'Main circuit closed, load 1.8 kW' }];
    if (s.breakerOff) lines.push({ t: s.elapsed, text: 'Main circuit open.' });
    return lines;
  }
  // generic fallback for simple devices
  const dev = state.devices[deviceId as keyof typeof state.devices];
  return [{ t: 0, text: dev ? `${dev.name}: state ${dev.on ? 'on' : 'off'}; no anomalies on record` : `Device "${deviceId}" not found` }];
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
    events.push({ t: s.elapsed, kind: 'sim', msg: { key: 'event.leak' } });
  }

  const kitchen: RoomId = 'kitchen';
  if (s.leakActive && !s.valveShut) {
    state.rooms[kitchen].waterLevelCm = round1(state.rooms[kitchen].waterLevelCm + LEAK_FLOW_CM_PER_SEC * dt);
    state.rooms[kitchen].humidityPct = Math.min(99, state.rooms[kitchen].humidityPct + 4 * dt);
    // Standing water and rising humidity both cost points.
    s.damageScore += state.rooms[kitchen].waterLevelCm * DAMAGE_PER_CM_PER_SEC * dt;
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
    events.push({ t: s.elapsed, kind: 'system', msg: { key: 'event.resolved' } });
    return { events, justResolved: true };
  }

  return { events, justResolved: false };
}

export function starRating(damageScore: number): { stars: number; grade: string } {
  if (damageScore < 150) return { stars: 3, grade: 'grade.gold' };
  if (damageScore < 400) return { stars: 2, grade: 'grade.qualified' };
  return { stars: 1, grade: 'grade.low' };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

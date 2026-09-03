import { useHouse } from '../store';
import type { Device } from '../sim/house';
import { MAINS_POWERED_DEVICES } from '../sim/house';
import { EventLog } from './EventLog';

const MCP_LABELS: Record<string, string> = {
  ready: 'WebMCP 原生连接',
  polyfill: 'WebMCP polyfill',
  registering: '检测 WebMCP',
  error: 'WebMCP 注册失败',
  unsupported: 'WebMCP 不可用',
};

function fmtClock(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

export function Dashboard() {
  const house = useHouse((s) => s.house);
  const mcpStatus = useHouse((s) => s.mcpStatus);
  const mcpDetail = useHouse((s) => s.mcpDetail);
  const setDevicePower = useHouse((s) => s.setDevicePower);
  const setThermostat = useHouse((s) => s.setThermostat);
  const requestDestructive = useHouse((s) => s.requestDestructive);

  const s = house.scenario;
  const kitchen = house.rooms.kitchen;
  const exerciseActive = s.phase === 'active';
  const leakRunning = s.leakActive && !s.valveShut;
  const showWarningBanner = mcpStatus === 'unsupported' || mcpStatus === 'error';

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="wordmark">HomeGuard</h1>
          <span className="wordmark-sub">智能屋抢救行动 · AGENT-NATIVE HOME</span>
        </div>
        <div className="topbar-stats">
          {s.phase !== 'idle' && (
            <>
              <div className="readout">
                <span className="readout-label">用时</span>
                <span className="readout-value">{fmtClock(s.elapsed)}</span>
              </div>
              <div className="readout">
                <span className="readout-label">损失</span>
                <span className={`readout-value ${s.damageScore > 100 ? 'danger' : ''}`}>
                  {Math.round(s.damageScore)}
                </span>
              </div>
            </>
          )}
          <span className={`mcp-chip ${mcpStatus}`}>{MCP_LABELS[mcpStatus] ?? mcpStatus}</span>
        </div>
      </header>

      {leakRunning && <div className="hazard" aria-hidden="true" />}

      {showWarningBanner && (
        <div className="banner warn">
          <span className="banner-tag">提示</span>
          <span>{mcpDetail}</span>
        </div>
      )}

      {leakRunning && (
        <div className="banner alarm">
          <span className="banner-tag">紧急</span>
          <span>
            厨房供水管爆裂，积水 {kitchen.waterLevelCm.toFixed(1)} cm 且持续上涨。
            可召唤 ChatGPT 智能体协助，或亲自处理。
          </span>
        </div>
      )}

      <main className="grid">
        {Object.values(house.rooms).map((room, i) => (
          <section key={room.id} className="card">
            <div className="card-head">
              <span className="card-index">0{i + 1}</span>
              <h2>{room.name}</h2>
              <span className="card-note">ROOM</span>
            </div>
            <div className="sensors">
              <div className="sensor">
                <span className="sensor-label">温度 TEMP</span>
                <span className="sensor-value">{room.temperatureC.toFixed(1)}°C</span>
              </div>
              <div className={`sensor ${room.humidityPct > 70 ? 'warn' : ''}`}>
                <span className="sensor-label">湿度 RH</span>
                <span className="sensor-value">{Math.round(room.humidityPct)}%</span>
              </div>
              {room.waterLevelCm > 0 && (
                <div className="sensor warn">
                  <span className="sensor-label">积水 WATER</span>
                  <span className="sensor-value">{room.waterLevelCm.toFixed(1)} cm</span>
                </div>
              )}
            </div>
            <div className="devices">
              {Object.values(house.devices)
                .filter((d) => d.room === room.id)
                .map((d) => (
                  <DeviceRow
                    key={d.id}
                    device={d}
                    mainsDead={s.breakerOff && MAINS_POWERED_DEVICES.includes(d.id)}
                    onSetPower={(on) => setDevicePower(d.id, on, 'human')}
                    onThermostat={(c) => setThermostat(c, 'human')}
                  />
                ))}
            </div>
          </section>
        ))}

        <section className="card utility">
          <div className="card-head">
            <span className="card-index">03</span>
            <h2>公用管路</h2>
            <span className="card-note">MAINS</span>
          </div>
          <div className="devices">
            <div className="device-row">
              <span className="device-name">
                <span className={`dot ${house.devices.main_valve.on ? 'on' : ''}`} />
                总水阀
              </span>
              <button
                className="mini danger"
                disabled={s.valveShut || !exerciseActive}
                onClick={() => {
                  requestDestructive('shut_off_main_valve', 'human').catch(() => {});
                }}
              >
                {s.valveShut ? '已关闭' : '关闭总水阀…'}
              </button>
            </div>
            <div className="device-row">
              <span className="device-name">
                <span className={`dot ${house.devices.main_breaker.on ? 'on' : ''}`} />
                总电闸
              </span>
              <button
                className="mini danger"
                disabled={s.breakerOff || !exerciseActive}
                onClick={() => {
                  requestDestructive('kill_main_breaker', 'human').catch(() => {});
                }}
              >
                {s.breakerOff ? '已断开' : '拉下总电闸…'}
              </button>
            </div>
          </div>
        </section>

        <EventLog />
      </main>
    </>
  );
}

function DeviceRow({ device, mainsDead, onSetPower, onThermostat }: {
  device: Device;
  mainsDead: boolean;
  onSetPower: (on: boolean) => void;
  onThermostat: (targetC: number) => void;
}) {
  const dotClass = device.on ? 'on' : mainsDead ? 'dead' : '';
  const name = (
    <span className="device-name">
      <span className={`dot ${dotClass}`} />
      {device.name}
    </span>
  );

  if (device.id === 'thermostat') {
    return (
      <div className="device-row">
        {name}
        <div className="seg">
          {[16, 20, 24, 28].map((c) => (
            <button key={c} disabled={mainsDead} onClick={() => onThermostat(c)}>
              {c}°C
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="device-row">
      {name}
      {device.toggleable && (
        <button
          className="mini"
          disabled={mainsDead && !device.on}
          onClick={() => onSetPower(!device.on)}
        >
          {device.on ? '关闭' : '开启'}
        </button>
      )}
    </div>
  );
}

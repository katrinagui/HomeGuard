import { useHouse } from '../store';
import type { Device } from '../sim/house';
import { MAINS_POWERED_DEVICES } from '../sim/house';
import { EventLog } from './EventLog';

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

  return (
    <>
      <header className="topbar">
        <div>
          <h1>🏠 HomeGuard</h1>
          <p className="subtitle">智能屋抢救行动 · WebMCP 演示</p>
        </div>
        <div className="topbar-stats">
          <span className={`badge mcp-${mcpStatus}`}>
            {mcpStatus === 'ready' && '🟢 WebMCP 已连接'}
            {mcpStatus === 'polyfill' && '🟡 WebMCP polyfill'}
            {mcpStatus === 'registering' && '⏳ 检测 WebMCP…'}
            {mcpStatus === 'error' && '🔴 WebMCP 注册失败'}
            {mcpStatus === 'unsupported' && '⚪ 不支持 WebMCP'}
          </span>
          {s.phase !== 'idle' && (
            <>
              <span className="stat">⏱ {Math.floor(s.elapsed / 60)}:{String(s.elapsed % 60).padStart(2, '0')}</span>
              <span className={`stat ${s.damageScore > 100 ? 'danger' : ''}`}>📉 损失 {Math.round(s.damageScore)}</span>
            </>
          )}
        </div>
      </header>

      {mcpStatus === 'unsupported' && (
        <div className="banner warn">{mcpDetail}</div>
      )}
      {mcpStatus === 'error' && (
        <div className="banner warn">{mcpDetail}</div>
      )}

      {s.leakActive && !s.valveShut && (
        <div className="banner alarm">
          🚨 紧急：厨房供水管爆裂，积水 {kitchen.waterLevelCm.toFixed(1)} cm 且持续上涨！
          你可以召唤 ChatGPT 智能体帮忙，或亲自处理。
        </div>
      )}

      <main className="grid">
        {Object.values(house.rooms).map((room) => (
          <section key={room.id} className="card">
            <h2>{room.name}</h2>
            <div className="sensors">
              <Sensor icon="🌡" label="温度" value={`${room.temperatureC.toFixed(1)}°C`} />
              <Sensor icon="💧" label="湿度" value={`${Math.round(room.humidityPct)}%`} warn={room.humidityPct > 70} />
              {room.waterLevelCm > 0 && (
                <Sensor icon="🌊" label="积水" value={`${room.waterLevelCm.toFixed(1)} cm`} warn />
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

        <section className="card">
          <h2>🔌 公用管路</h2>
          <div className="devices">
            <UtilityRow
              label="总水阀"
              on={house.devices.main_valve.on}
              actionLabel="关闭总水阀…"
              disabled={s.valveShut || !exerciseActive}
              onAction={() => {
                requestDestructive('shut_off_main_valve', 'human').catch(() => {});
              }}
            />
            <UtilityRow
              label="总电闸"
              on={house.devices.main_breaker.on}
              actionLabel="拉下总电闸…"
              disabled={s.breakerOff || !exerciseActive}
              onAction={() => {
                requestDestructive('kill_main_breaker', 'human').catch(() => {});
              }}
            />
          </div>
        </section>

        <EventLog />
      </main>
    </>
  );
}

function Sensor({ icon, label, value, warn }: { icon: string; label: string; value: string; warn?: boolean }) {
  return (
    <div className={`sensor ${warn ? 'warn' : ''}`}>
      <span className="sensor-icon">{icon}</span>
      <span className="sensor-label">{label}</span>
      <span className="sensor-value">{value}</span>
    </div>
  );
}

function DeviceRow({ device, mainsDead, onSetPower, onThermostat }: {
  device: Device;
  mainsDead: boolean;
  onSetPower: (on: boolean) => void;
  onThermostat: (targetC: number) => void;
}) {
  if (device.id === 'thermostat') {
    return (
      <div className="device-row">
        <span>{device.on ? '🟢' : '⚪'} {device.name}</span>
        <div className="thermo">
          {[16, 20, 24, 28].map((c) => (
            <button key={c} className="mini" disabled={mainsDead} onClick={() => onThermostat(c)}>{c}°</button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="device-row">
      <span>{device.on ? '🟢' : '⚪'} {device.name}</span>
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

function UtilityRow({ label, on, actionLabel, disabled, onAction }: {
  label: string;
  on: boolean;
  actionLabel: string;
  disabled?: boolean;
  onAction: () => void;
}) {
  return (
    <div className="device-row">
      <span>{on ? '🟢' : '🔴'} {label}</span>
      <button className="mini danger" disabled={disabled} onClick={onAction}>
        {disabled ? '已关闭' : actionLabel}
      </button>
    </div>
  );
}

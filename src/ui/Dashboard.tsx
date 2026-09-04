import { useHouse } from '../store';
import type { Device } from '../sim/house';
import { MAINS_POWERED_DEVICES } from '../sim/house';
import { translate, tMsg, useLocale } from '../i18n';
import { EventLog } from './EventLog';
import { House3D } from './House3D';

const MCP_LABELS: Record<string, string> = {
  ready: 'ui.mcp.ready',
  polyfill: 'ui.mcp.polyfill',
  registering: 'ui.mcp.registering',
  error: 'ui.mcp.error',
  unsupported: 'ui.mcp.unsupported',
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
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const tr = (key: string, params?: Record<string, string | number>) => translate(key, locale, params);

  const s = house.scenario;
  const kitchen = house.rooms.kitchen;
  const exerciseActive = s.phase === 'active';
  const leakRunning = s.leakActive && !s.valveShut;
  // Heater is "running" while the fault is active and the thermostat still has power.
  const heaterRunning = s.heaterActive && house.devices.thermostat.on;
  const showWarningBanner = mcpStatus === 'unsupported' || mcpStatus === 'error';
  const deviceName = (d: { name: string; nameZh: string }) => (locale === 'zh' ? d.nameZh : d.name);

  const deviceRow = (d: Device) => {
    const mainsDead = s.breakerOff && MAINS_POWERED_DEVICES.includes(d.id);
    const dotClass = d.on ? 'on' : mainsDead ? 'dead' : '';
    const label = (
      <span className="device-name">
        <span className={`dot ${dotClass}`} />
        {deviceName(d)}
      </span>
    );
    if (d.id === 'thermostat') {
      return (
        <div className="device-row" key={d.id}>
          {label}
          <div className="seg">
            {[16, 20, 24, 28].map((c) => (
              <button key={c} disabled={mainsDead} onClick={() => setThermostat(c, 'human')}>
                {c}°C
              </button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="device-row" key={d.id}>
        {label}
        {d.toggleable && (
          <button
            className="mini"
            disabled={mainsDead && !d.on}
            onClick={() => setDevicePower(d.id, !d.on, 'human')}
          >
            {d.on ? tr('ui.action.off') : tr('ui.action.on')}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="wordmark">HomeGuard</h1>
          <span className="wordmark-sub">
            {locale === 'zh' ? '智能屋抢救行动 · AGENT-NATIVE HOME' : 'AGENT-NATIVE SMART-HOME DRILL'}
          </span>
        </div>
        <div className="topbar-stats">
          <span className={`mcp-chip ${mcpStatus}`}>{tr(MCP_LABELS[mcpStatus] ?? mcpStatus)}</span>
          <div className="lang-switch" role="group" aria-label="Language">
            <button className={locale === 'zh' ? 'active' : ''} onClick={() => setLocale('zh')}>中文</button>
            <button className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>EN</button>
          </div>
        </div>
      </header>

      {showWarningBanner && (
        <div className="banner">
          <span className="banner-tag">{tr('ui.banner.notice')}</span>
          <span>{tMsg(mcpDetail, locale)}</span>
        </div>
      )}

      <section className="stage">
        {(leakRunning || heaterRunning) && <div className="stage-hazard" aria-hidden="true" />}
        {leakRunning && (
          <div className="stage-alert">
            <span className="banner-tag">{tr('ui.banner.emergency')}</span>
            <span>{tr('ui.banner.alarmText', { water: kitchen.waterLevelCm.toFixed(1) })}</span>
          </div>
        )}
        {heaterRunning && (
          <div className="stage-alert">
            <span className="banner-tag">{tr('ui.banner.emergency')}</span>
            <span>{tr('ui.banner.heaterText', { temp: house.rooms.living_room.temperatureC.toFixed(1) })}</span>
          </div>
        )}
        <House3D />
        {s.phase !== 'idle' && (
          <div className="stage-readouts">
            <div className="readout">
              <span className="readout-label">{tr('ui.readout.elapsed')}</span>
              <span className="readout-value">{fmtClock(s.elapsed)}</span>
            </div>
            <div className="readout">
              <span className="readout-label">{tr('ui.readout.damage')}</span>
              <span className={`readout-value ${s.damageScore > 100 ? 'danger' : ''}`}>
                {Math.round(s.damageScore)}
              </span>
            </div>
          </div>
        )}
        <span className="stage-hint">{tr('ui.house3d.drag')}</span>
      </section>

      <section className="strip" aria-label="sensors">
        {Object.values(house.rooms).map((room) => (
          <div className="strip-group" key={room.id}>
            <span className="strip-group-label">{locale === 'zh' ? room.nameZh : room.name}</span>
            <div className="strip-cells">
              <div className="strip-cell">
                <span className="sensor-label">{tr('ui.sensor.temp')}</span>
                <span className="sensor-value">{room.temperatureC.toFixed(1)}°C</span>
              </div>
              <div className={`strip-cell ${room.humidityPct > 70 ? 'warn' : ''}`}>
                <span className="sensor-label">{tr('ui.sensor.humidity')}</span>
                <span className="sensor-value">{Math.round(room.humidityPct)}%</span>
              </div>
              {room.waterLevelCm > 0 && (
                <div className="strip-cell warn">
                  <span className="sensor-label">{tr('ui.sensor.water')}</span>
                  <span className="sensor-value">{room.waterLevelCm.toFixed(1)} cm</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div className="strip-group">
          <span className="strip-group-label">{tr('ui.readout.damage')}</span>
          <div className="strip-cells">
            <div className={`strip-cell ${s.damageScore > 100 ? 'warn' : ''}`}>
              <span className="sensor-label">SCORE</span>
              <span className="sensor-value">{Math.round(s.damageScore)}</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="devices">
        <div className="sec">
          <span className="sec-index">01</span>
          <h2 className="sec-title">{tr('ui.section.matrix')}</h2>
          <span className="sec-note">DEVICE MATRIX</span>
        </div>
        <div className="matrix">
          <div className="matrix-col">
            <div className="matrix-colhead">{locale === 'zh' ? '房间设备' : 'ROOMS'}</div>
            {Object.values(house.devices)
              .filter((d) => d.room === 'kitchen' || d.room === 'living_room')
              .map(deviceRow)}
          </div>
          <div className="matrix-col">
            <div className="matrix-colhead">{tr('ui.card.mainsTitle')}</div>
            {([
              { id: 'main_valve', action: 'shut_off_main_valve' },
              { id: 'main_breaker', action: 'kill_main_breaker' },
            ] as const).map(({ id, action }) => {
              const d = house.devices[id];
              const shut = action === 'shut_off_main_valve' ? s.valveShut : s.breakerOff;
              return (
                <div className="device-row" key={id}>
                  <span className="device-name">
                    <span className={`dot ${d.on ? 'on' : ''}`} />
                    {deviceName(d)}
                  </span>
                  <button
                    className="mini danger"
                    disabled={shut || !exerciseActive}
                    onClick={() => {
                      requestDestructive(action, 'human').catch(() => {});
                    }}
                  >
                    {shut
                      ? tr(action === 'shut_off_main_valve' ? 'ui.utility.valveShut' : 'ui.utility.breakerOff')
                      : tr(action === 'shut_off_main_valve' ? 'ui.utility.shutValve' : 'ui.utility.killBreaker')}
                  </button>
                </div>
              );
            })}
            {deviceRow(house.devices.smart_lock)}
          </div>
        </div>
      </section>

      <section aria-label="event feed">
        <div className="sec">
          <span className="sec-index">02</span>
          <h2 className="sec-title">{tr('ui.card.log')}</h2>
          <span className="sec-note">{tr('ui.card.logNote')}</span>
        </div>
        <EventLog />
      </section>

      <footer className="page-footer">
        <a className="learn-link" href="#learn">{tr('ui.start.learn')}</a>
      </footer>
    </>
  );
}

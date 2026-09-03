import { useHouse } from '../store';
import type { Device } from '../sim/house';
import { MAINS_POWERED_DEVICES } from '../sim/house';
import { translate, tMsg, useLocale } from '../i18n';
import { EventLog } from './EventLog';

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
  const heaterRunning = s.heaterActive && !s.heaterOff;
  const showWarningBanner = mcpStatus === 'unsupported' || mcpStatus === 'error';
  const deviceName = (d: { name: string; nameZh: string }) => (locale === 'zh' ? d.nameZh : d.name);

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
          {s.phase !== 'idle' && (
            <>
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
            </>
          )}
          <span className={`mcp-chip ${mcpStatus}`}>{tr(`ui.mcp.${mcpStatus}`)}</span>
          <div className="lang-switch" role="group" aria-label="Language">
            <button className={locale === 'zh' ? 'active' : ''} onClick={() => setLocale('zh')}>中文</button>
            <button className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>EN</button>
          </div>
        </div>
      </header>

      {(leakRunning || heaterRunning) && <div className="hazard" aria-hidden="true" />}

      {showWarningBanner && (
        <div className="banner warn">
          <span className="banner-tag">{tr('ui.banner.notice')}</span>
          <span>{tMsg(mcpDetail, locale)}</span>
        </div>
      )}

      {leakRunning && (
        <div className="banner alarm">
          <span className="banner-tag">{tr('ui.banner.emergency')}</span>
          <span>{tr('ui.banner.alarmText', { water: kitchen.waterLevelCm.toFixed(1) })}</span>
        </div>
      )}

      {heaterRunning && (
        <div className="banner alarm">
          <span className="banner-tag">{tr('ui.banner.emergency')}</span>
          <span>{tr('ui.banner.heaterText', { temp: house.rooms.living_room.temperatureC.toFixed(1) })}</span>
        </div>
      )}

      <main className="grid">
        {Object.values(house.rooms).map((room, i) => (
          <section key={room.id} className="card">
            <div className="card-head">
              <span className="card-index">0{i + 1}</span>
              <h2>{locale === 'zh' ? room.nameZh : room.name}</h2>
              <span className="card-note">{tr('ui.card.room')}</span>
            </div>
            <div className="sensors">
              <div className="sensor">
                <span className="sensor-label">{tr('ui.sensor.temp')}</span>
                <span className="sensor-value">{room.temperatureC.toFixed(1)}°C</span>
              </div>
              <div className={`sensor ${room.humidityPct > 70 ? 'warn' : ''}`}>
                <span className="sensor-label">{tr('ui.sensor.humidity')}</span>
                <span className="sensor-value">{Math.round(room.humidityPct)}%</span>
              </div>
              {room.waterLevelCm > 0 && (
                <div className="sensor warn">
                  <span className="sensor-label">{tr('ui.sensor.water')}</span>
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
                    label={deviceName(d)}
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
            <h2>{tr('ui.card.mainsTitle')}</h2>
            <span className="card-note">{tr('ui.card.mains')}</span>
          </div>
          <div className="devices">
            <div className="device-row">
              <span className="device-name">
                <span className={`dot ${house.devices.main_valve.on ? 'on' : ''}`} />
                {deviceName(house.devices.main_valve)}
              </span>
              <button
                className="mini danger"
                disabled={s.valveShut || !exerciseActive}
                onClick={() => {
                  requestDestructive('shut_off_main_valve', 'human').catch(() => {});
                }}
              >
                {s.valveShut ? tr('ui.utility.valveShut') : tr('ui.utility.shutValve')}
              </button>
            </div>
            <div className="device-row">
              <span className="device-name">
                <span className={`dot ${house.devices.main_breaker.on ? 'on' : ''}`} />
                {deviceName(house.devices.main_breaker)}
              </span>
              <button
                className="mini danger"
                disabled={s.breakerOff || !exerciseActive}
                onClick={() => {
                  requestDestructive('kill_main_breaker', 'human').catch(() => {});
                }}
              >
                {s.breakerOff ? tr('ui.utility.breakerOff') : tr('ui.utility.killBreaker')}
              </button>
            </div>
          </div>
        </section>

        <EventLog />
      </main>

      <footer className="page-footer">
        <a className="learn-link" href="#learn">{tr('ui.start.learn')}</a>
      </footer>
    </>
  );
}

function DeviceRow({ device, label, mainsDead, onSetPower, onThermostat }: {
  device: Device;
  label: string;
  mainsDead: boolean;
  onSetPower: (on: boolean) => void;
  onThermostat: (targetC: number) => void;
}) {
  const locale = useLocale((s) => s.locale);
  const tr = (key: string) => translate(key, locale);
  const dotClass = device.on ? 'on' : mainsDead ? 'dead' : '';
  const name = (
    <span className="device-name">
      <span className={`dot ${dotClass}`} />
      {label}
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
          {device.on ? tr('ui.action.off') : tr('ui.action.on')}
        </button>
      )}
    </div>
  );
}

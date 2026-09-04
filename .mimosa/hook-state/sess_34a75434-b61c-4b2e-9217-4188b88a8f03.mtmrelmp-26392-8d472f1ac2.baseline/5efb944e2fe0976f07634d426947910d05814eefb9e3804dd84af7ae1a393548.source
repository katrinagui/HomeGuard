import { useHouse } from '../store';
import { starRating } from '../sim/engine';
import { translate, tMsg, useLocale } from '../i18n';

function fmtClock(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

export function Debrief() {
  const house = useHouse((s) => s.house);
  const reset = useHouse((s) => s.reset);
  const locale = useLocale((s) => s.locale);
  const tr = (key: string) => translate(key, locale);

  const { damageScore, elapsed } = house.scenario;
  const { stars, grade } = starRating(damageScore);
  const agentCalls = house.toolCalls.filter((c) => c.actor === 'agent');
  const humanActions = house.events.filter((e) => e.kind === 'human').length;
  const gradeClass = stars === 3 ? '' : stars === 2 ? 'mid' : 'low';
  const starMarks = '★'.repeat(stars) + '☆'.repeat(3 - stars);

  return (
    <div className="modal-backdrop">
      <div className="modal debrief">
        <p className="kicker-ink">{tr('ui.debrief.kicker')}</p>
        <h1>{tr('ui.debrief.title')}</h1>
        <div className={`grade-stamp ${gradeClass}`}>
          {starMarks} {tr(grade)}
        </div>

        <div className="debrief-stats">
          <div className="debrief-stat">
            <span className="debrief-num">{Math.round(damageScore)}</span>
            <span className="debrief-label">{tr('ui.debrief.damage')}</span>
          </div>
          <div className="debrief-stat">
            <span className="debrief-num">{fmtClock(elapsed)}</span>
            <span className="debrief-label">{tr('ui.debrief.time')}</span>
          </div>
          <div className="debrief-stat">
            <span className="debrief-num">{agentCalls.length} / {humanActions}</span>
            <span className="debrief-label">{tr('ui.debrief.calls')}</span>
          </div>
        </div>

        <h2>{tr('ui.debrief.timelineHead')}</h2>
        {agentCalls.length === 0 ? (
          <p className="muted">{tr('ui.debrief.none')}</p>
        ) : (
          <table className="timeline">
            <thead>
              <tr>
                <th>{tr('ui.debrief.thTime')}</th>
                <th>{tr('ui.debrief.thTool')}</th>
                <th>{tr('ui.debrief.thInput')}</th>
                <th>{tr('ui.debrief.thResult')}</th>
              </tr>
            </thead>
            <tbody>
              {agentCalls.map((c, i) => (
                <tr key={i} className={`tl-${c.outcome}`}>
                  <td>t+{c.t}s</td>
                  <td><code>{c.tool}</code></td>
                  <td>{Object.keys(c.input).length ? JSON.stringify(c.input) : '—'}</td>
                  <td>
                    {tr(`ui.debrief.outcome.${c.outcome === 'pending_confirmation' ? 'pending' : c.outcome}`)}
                    {c.detail ? ` · ${tMsg(c.detail, locale)}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="debrief-coda">
          {locale === 'zh'
            ? '今天你真实的家做不到这一点——你的管家智能体看不见你家的状态。WebMCP 正在改变它：'
            : 'Your real home cannot do this today — your butler agent cannot even see your house. WebMCP is changing that: '}
          <code>document.modelContext</code>
        </p>
        <button className="primary big" onClick={reset}>{tr('ui.debrief.again')}</button>
      </div>
    </div>
  );
}

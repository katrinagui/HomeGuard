import { useEffect, useRef } from 'react';
import { useHouse } from '../store';
import type { EventKind } from '../sim/house';
import { translate, tMsg, useLocale } from '../i18n';

const TAGS: Record<EventKind, string> = {
  system: 'SYS',
  agent: 'AGT',
  human: 'YOU',
  sim: 'SIM',
};

export function EventLog() {
  const events = useHouse((s) => s.house.events);
  const locale = useLocale((s) => s.locale);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [events.length]);

  return (
    <section className="card log-card">
      <div className="card-head">
        <span className="card-index">04</span>
        <h2>{translate('ui.card.log', locale)}</h2>
        <span className="card-note">{translate('ui.card.logNote', locale)}</span>
      </div>
      <div className="log">
        {events.slice(-60).map((e, i) => (
          <div key={i} className="log-line">
            <span className="log-t">{fmtT(e.t)}</span>
            <span className={`tag tag-${e.kind}`}>{TAGS[e.kind]}</span>
            <span>{tMsg(e.msg, locale)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}

function fmtT(t: number): string {
  return `[${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}]`;
}

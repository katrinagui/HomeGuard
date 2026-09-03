import { useEffect, useRef } from 'react';
import { useHouse } from '../store';
import type { EventKind } from '../sim/house';

const TAGS: Record<EventKind, string> = {
  system: 'SYS',
  agent: 'AGT',
  human: 'YOU',
  sim: 'SIM',
};

export function EventLog() {
  const events = useHouse((s) => s.house.events);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [events.length]);

  return (
    <section className="card log-card">
      <div className="card-head">
        <span className="card-index">04</span>
        <h2>事件日志</h2>
        <span className="card-note">EVENT LOG</span>
      </div>
      <div className="log">
        {events.slice(-60).map((e, i) => (
          <div key={i} className="log-line">
            <span className="log-t">{fmtT(e.t)}</span>
            <span className={`tag tag-${e.kind}`}>{TAGS[e.kind]}</span>
            <span>{e.text}</span>
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

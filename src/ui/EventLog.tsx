import { useEffect, useRef } from 'react';
import { useHouse } from '../store';

export function EventLog() {
  const events = useHouse((s) => s.house.events);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [events.length]);

  return (
    <section className="card log-card">
      <h2>📜 事件日志</h2>
      <div className="log">
        {events.slice(-60).map((e, i) => (
          <div key={i} className={`log-line log-${e.kind}`}>
            <span className="log-t">[{Math.floor(e.t / 60)}:{String(Math.floor(e.t % 60)).padStart(2, '0')}]</span>
            <span>{e.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}

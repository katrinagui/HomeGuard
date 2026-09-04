import { useEffect, useState } from 'react';
import { useHouse, CONFIRMATION_TIMEOUT_MS } from '../store';
import { translate, useLocale } from '../i18n';

const TOTAL_SECONDS = Math.round(CONFIRMATION_TIMEOUT_MS / 1000);

export function ConfirmCard() {
  const pending = useHouse((s) => s.pendingConfirmation);
  const confirmPending = useHouse((s) => s.confirmPending);
  const rejectPending = useHouse((s) => s.rejectPending);
  const locale = useLocale((s) => s.locale);
  const tr = (key: string, params?: Record<string, string | number>) => translate(key, locale, params);
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);

  useEffect(() => {
    if (!pending) return;
    setRemaining(TOTAL_SECONDS);
    const iv = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(iv);
  }, [pending?.id]);

  if (!pending) return null;

  const isValve = pending.action === 'shut_off_main_valve';
  const title = tr(isValve ? 'ui.confirm.valveTitle' : 'ui.confirm.breakerTitle');
  const body = tr(isValve ? 'ui.confirm.valveBody' : 'ui.confirm.breakerBody');
  const approve = tr(isValve ? 'ui.confirm.valveApprove' : 'ui.confirm.breakerApprove');

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <p className="kicker">{tr('ui.confirm.kicker')}</p>
        <div className="modal-rule" aria-hidden="true" />
        <h2>{title}</h2>
        <p>{body}</p>
        {pending.actor === 'agent' && (
          <p className="modal-source">
            {tr('ui.confirm.agentSource')} · <span className="request-id">#{pending.id}</span>
          </p>
        )}
        <p className="modal-expiry" aria-live="polite">
          {tr('ui.confirm.expires', { seconds: remaining })}
        </p>
        <div className="modal-actions">
          <button className="primary" onClick={confirmPending}>{approve}</button>
          <button className="secondary" onClick={rejectPending}>{tr('ui.confirm.reject')}</button>
        </div>
      </div>
    </div>
  );
}

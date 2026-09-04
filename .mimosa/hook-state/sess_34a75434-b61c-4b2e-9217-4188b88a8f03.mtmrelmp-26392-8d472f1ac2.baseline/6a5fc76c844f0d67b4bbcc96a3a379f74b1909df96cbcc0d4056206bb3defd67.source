import { useState } from 'react';
import { useHouse } from '../store';
import { translate, useLocale } from '../i18n';

export function StartOverlay() {
  const start = useHouse((s) => s.startExercise);
  const mcpStatus = useHouse((s) => s.mcpStatus);
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const tr = (key: string) => translate(key, locale);
  const [copied, setCopied] = useState(false);

  const hintKey =
    mcpStatus === 'ready'
      ? 'ui.start.hint.ready'
      : mcpStatus === 'polyfill'
        ? 'ui.start.hint.polyfill'
        : mcpStatus === 'registering'
          ? 'ui.start.hint.registering'
          : 'ui.start.hint.unavailable';

  const begin = () => {
    // Random scenario each drill; the store defaults deterministically for tests.
    start(Math.random() < 0.5 ? 'kitchen_leak' : 'heater_runaway');
  };

  const copyPrompt = () => {
    const prompt = translate('ui.start.prompt', locale);
    void navigator.clipboard?.writeText(prompt).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }).catch(() => {
      // clipboard unavailable (permissions/insecure context) — silently ignore
    });
  };

  return (
    <div className="modal-backdrop start-backdrop">
      <div className="modal start">
        <div className="start-topline">
          <div className="lang-switch" role="group" aria-label="Language">
            <button className={locale === 'zh' ? 'active' : ''} onClick={() => setLocale('zh')}>中文</button>
            <button className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>EN</button>
          </div>
          <a className="learn-link" href="#learn">{tr('ui.start.learn')}</a>
        </div>
        <div className="hazard" aria-hidden="true" />
        <h1>HomeGuard</h1>
        <p className="start-sub">{tr('ui.start.sub')}</p>
        <p>{tr('ui.start.body')}</p>
        <p className="start-hint">{tr(hintKey)}</p>
        <div className="start-actions">
          <button className="primary big" onClick={begin}>{tr('ui.start.begin')}</button>
          <button className="secondary" onClick={copyPrompt}>
            {copied ? tr('ui.start.copied') : tr('ui.start.copy')}
          </button>
        </div>
      </div>
    </div>
  );
}

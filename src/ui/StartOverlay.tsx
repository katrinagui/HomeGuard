import { useHouse } from '../store';
import { translate, useLocale } from '../i18n';

export function StartOverlay() {
  const start = useHouse((s) => s.startExercise);
  const mcpStatus = useHouse((s) => s.mcpStatus);
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const tr = (key: string) => translate(key, locale);

  const hintKey =
    mcpStatus === 'ready'
      ? 'ui.start.hint.ready'
      : mcpStatus === 'polyfill'
        ? 'ui.start.hint.polyfill'
        : mcpStatus === 'registering'
          ? 'ui.start.hint.registering'
          : 'ui.start.hint.unavailable';

  return (
    <div className="modal-backdrop start-backdrop">
      <div className="modal start">
        <div className="lang-switch start-lang" role="group" aria-label="Language">
          <button className={locale === 'zh' ? 'active' : ''} onClick={() => setLocale('zh')}>中文</button>
          <button className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>EN</button>
        </div>
        <div className="hazard" aria-hidden="true" />
        <h1>HomeGuard</h1>
        <p className="start-sub">{tr('ui.start.sub')}</p>
        <p>{tr('ui.start.body')}</p>
        <p className="start-hint">{tr(hintKey)}</p>
        <button className="primary big" onClick={start}>{tr('ui.start.begin')}</button>
      </div>
    </div>
  );
}

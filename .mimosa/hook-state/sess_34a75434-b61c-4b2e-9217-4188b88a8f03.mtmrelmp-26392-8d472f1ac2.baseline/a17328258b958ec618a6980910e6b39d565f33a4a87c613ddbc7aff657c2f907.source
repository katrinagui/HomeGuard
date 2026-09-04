import { buildTools } from '../mcp/tools';
import { translate, useLocale } from '../i18n';

/**
 * "#learn" — the agent's view of this page: the registered tool list and a
 * live get_house_status payload. Reaches judges and learners without a chat
 * client; the data is exactly what an in-browser agent receives.
 */
export function LearnPage() {
  const locale = useLocale((s) => s.locale);
  const tr = (key: string) => translate(key, locale);

  const tools = buildTools();
  const statusTool = tools.find((t) => t.name === 'get_house_status');
  const sample = statusTool ? statusTool.execute({}, {}) : null;

  return (
    <div className="app learn">
      <header className="topbar">
        <div>
          <h1 className="wordmark">{tr('ui.learn.title')}</h1>
          <span className="wordmark-sub">HomeGuard · AGENT VIEW</span>
        </div>
        <div className="topbar-stats">
          <a className="learn-link" href="#drill">{tr('ui.learn.back')}</a>
        </div>
      </header>

      <p className="learn-sub">{tr('ui.learn.sub')}</p>

      <div className="learn-tools">
        {tools.map((tool, i) => (
          <section key={tool.name} className="card">
            <div className="card-head">
              <span className="card-index">{String(i + 1).padStart(2, '0')}</span>
              <h2 className="mono">{tool.name}</h2>
              <span className={`chip ${tool.annotations?.readOnlyHint ? 'chip-ro' : ''}`}>
                {tool.annotations?.readOnlyHint ? tr('ui.learn.readonly') : '—'}
              </span>
            </div>
            <p className="learn-desc">{tool.description}</p>
          </section>
        ))}
      </div>

      <section className="card log-card">
        <div className="card-head">
          <span className="card-index">{'>'}</span>
          <h2>{tr('ui.learn.sampleHead')}</h2>
        </div>
        <pre className="learn-json">{JSON.stringify(sample, null, 2)}</pre>
      </section>
    </div>
  );
}

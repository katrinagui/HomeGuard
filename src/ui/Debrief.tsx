import { useHouse } from '../store';
import { starRating } from '../sim/engine';

export function Debrief() {
  const house = useHouse((s) => s.house);
  const reset = useHouse((s) => s.reset);

  const { damageScore, elapsed } = house.scenario;
  const { stars, label } = starRating(damageScore);
  const agentCalls = house.toolCalls.filter((c) => c.actor === 'agent');
  const humanActions = house.events.filter((e) => e.kind === 'human').length;

  return (
    <div className="modal-backdrop">
      <div className="modal debrief">
        <h1>✅ 险情解除</h1>
        <div className="debrief-stats">
          <div className="debrief-stat">
            <span className="debrief-num">{stars > 0 ? '⭐'.repeat(stars) : '—'}</span>
            <span className="debrief-label">{label}</span>
          </div>
          <div className="debrief-stat">
            <span className="debrief-num">{Math.round(damageScore)}</span>
            <span className="debrief-label">损失分数（越低越好）</span>
          </div>
          <div className="debrief-stat">
            <span className="debrief-num">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
            <span className="debrief-label">处置用时</span>
          </div>
          <div className="debrief-stat">
            <span className="debrief-num">{agentCalls.length} / {humanActions}</span>
            <span className="debrief-label">智能体工具调用 / 人工操作</span>
          </div>
        </div>

        <h2>🤖 智能体操作复盘</h2>
        {agentCalls.length === 0 ? (
          <p className="muted">本次全程人工处置，智能体未执行任何工具调用。再玩一次，试试召唤 ChatGPT！</p>
        ) : (
          <table className="timeline">
            <thead>
              <tr><th>时间</th><th>工具</th><th>输入</th><th>结果</th></tr>
            </thead>
            <tbody>
              {agentCalls.map((c, i) => (
                <tr key={i} className={`tl-${c.outcome}`}>
                  <td>t+{c.t}s</td>
                  <td><code>{c.tool}</code></td>
                  <td>{Object.keys(c.input).length ? JSON.stringify(c.input) : '—'}</td>
                  <td>{outcomeLabel(c.outcome)}{c.detail ? ` · ${c.detail}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="debrief-coda">
          今天你真实的家做不到这一点——你的管家智能体看不见你家的状态。
          <br />WebMCP 正在改变它：<code>document.modelContext</code>
        </p>
        <button className="primary big" onClick={reset}>再来一次</button>
      </div>
    </div>
  );
}

function outcomeLabel(outcome: string): string {
  switch (outcome) {
    case 'ok': return '✅ 成功';
    case 'pending_confirmation': return '⏸ 等待确认';
    case 'rejected': return '🚫 被拒绝';
    case 'error': return '❌ 出错';
    default: return outcome;
  }
}

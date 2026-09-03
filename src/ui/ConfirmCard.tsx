import { useHouse } from '../store';

const CONSEQUENCES: Record<string, { title: string; body: string; approve: string }> = {
  shut_off_main_valve: {
    title: '关闭总水阀',
    body: '全屋将立即停水；正在运行的洗衣机/洗碗机将停止。这是止住厨房漏水的唯一手段。',
    approve: '确认关闭总水阀',
  },
  kill_main_breaker: {
    title: '拉下总电闸',
    body: '全屋市电设备将立即断电。冰箱接在同一回路，冷藏食材会报废（损失 +120 分）。请确认是否继续。',
    approve: '确认拉下总电闸',
  },
};

export function ConfirmCard() {
  const pending = useHouse((s) => s.pendingConfirmation);
  const confirmPending = useHouse((s) => s.confirmPending);
  const rejectPending = useHouse((s) => s.rejectPending);

  if (!pending) return null;
  const c = CONSEQUENCES[pending.action];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={c.title}>
      <div className="modal">
        <p className="kicker">危险操作 · REQUIRES CONFIRMATION</p>
        <div className="modal-rule" aria-hidden="true" />
        <h2>{c.title}</h2>
        <p>{c.body}</p>
        {pending.actor === 'agent' && (
          <p className="modal-source">来源：ChatGPT 智能体请求执行此操作</p>
        )}
        <div className="modal-actions">
          <button className="primary" onClick={confirmPending}>{c.approve}</button>
          <button className="secondary" onClick={rejectPending}>拒绝</button>
        </div>
      </div>
    </div>
  );
}

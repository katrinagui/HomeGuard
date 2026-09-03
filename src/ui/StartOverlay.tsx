import { useHouse } from '../store';

export function StartOverlay() {
  const start = useHouse((s) => s.startExercise);
  const mcpStatus = useHouse((s) => s.mcpStatus);

  return (
    <div className="modal-backdrop">
      <div className="modal start">
        <h1>🏠 HomeGuard</h1>
        <p className="start-sub">智能屋抢救行动</p>
        <p>
          你家的厨房供水管即将爆裂。你可以亲自抢修，也可以召唤
          <b> ChatGPT 智能体</b>当你的物业管家——它会读取全屋状态、翻查设备日志、
          定位故障，并在执行<b>危险操作</b>前请求你的确认。
        </p>
        <p className="start-hint">
          {mcpStatus === 'ready' && '🟢 WebMCP 已就绪，智能体可以看到本页的全部工具。'}
          {mcpStatus === 'polyfill' && '🟡 当前浏览器不支持原生 WebMCP，已启用 polyfill 演示模式。'}
          {mcpStatus === 'registering' && '⏳ 正在检测 WebMCP…'}
          {(mcpStatus === 'unsupported' || mcpStatus === 'error') &&
            '⚪ WebMCP 不可用：你仍可手动游玩，但智能体无法看到本页工具。'}
        </p>
        <button className="primary big" onClick={start}>开始演习</button>
      </div>
    </div>
  );
}

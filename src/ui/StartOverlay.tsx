import { useHouse } from '../store';

export function StartOverlay() {
  const start = useHouse((s) => s.startExercise);
  const mcpStatus = useHouse((s) => s.mcpStatus);

  const hint =
    mcpStatus === 'ready'
      ? 'WebMCP 已就绪：智能体可以看到本页注册的全部工具。'
      : mcpStatus === 'polyfill'
        ? '当前浏览器不支持原生 WebMCP，已启用 polyfill 演示模式。'
        : mcpStatus === 'registering'
          ? '正在检测 WebMCP…'
          : 'WebMCP 不可用：你仍可手动游玩，但智能体无法看到本页工具。';

  return (
    <div className="modal-backdrop start-backdrop">
      <div className="modal start">
        <div className="hazard" aria-hidden="true" />
        <h1>HomeGuard</h1>
        <p className="start-sub">智能屋抢救行动 · 应急处置演习</p>
        <p>
          你家的厨房供水管即将爆裂。你可以亲自抢修，也可以召唤
          ChatGPT 智能体担任物业管家——它通过本页注册的 WebMCP
          工具读取全屋状态、翻查设备日志、定位故障，
          并在执行任何危险操作前，把决定权交还给你。
        </p>
        <p className="start-hint">{hint}</p>
        <button className="primary big" onClick={start}>开始演习</button>
      </div>
    </div>
  );
}

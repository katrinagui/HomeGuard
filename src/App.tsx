import { useEffect } from 'react';
import { useHouse } from './store';
import { setupWebMcp } from './mcp/register';
import { Dashboard } from './ui/Dashboard';
import { ConfirmCard } from './ui/ConfirmCard';
import { Debrief } from './ui/Debrief';
import { StartOverlay } from './ui/StartOverlay';

const TICK_MS = 1000;

export default function App() {
  const phase = useHouse((s) => s.house.scenario.phase);

  // Game loop: 1 tick per second.
  useEffect(() => {
    const id = window.setInterval(() => useHouse.getState().tickOnce(1), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Register WebMCP tools once; dispose unregisters when the app unmounts
  // (also keeps React StrictMode's double-mount from duplicating tools).
  useEffect(() => setupWebMcp().dispose, []);

  return (
    <div className="app">
      <Dashboard />
      {phase === 'idle' && <StartOverlay />}
      {phase === 'resolved' && <Debrief />}
      <ConfirmCard />
    </div>
  );
}

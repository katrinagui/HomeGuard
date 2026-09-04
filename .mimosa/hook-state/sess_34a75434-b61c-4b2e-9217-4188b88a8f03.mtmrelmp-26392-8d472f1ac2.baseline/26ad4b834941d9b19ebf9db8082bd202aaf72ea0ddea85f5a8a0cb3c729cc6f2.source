import { useEffect, useState } from 'react';
import { useHouse } from './store';
import { setupWebMcp } from './mcp/register';
import { Dashboard } from './ui/Dashboard';
import { ConfirmCard } from './ui/ConfirmCard';
import { Debrief } from './ui/Debrief';
import { StartOverlay } from './ui/StartOverlay';
import { LearnPage } from './ui/LearnPage';

const TICK_MS = 1000;

function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function App() {
  const phase = useHouse((s) => s.house.scenario.phase);
  const hash = useHashRoute();

  // Game loop: 1 tick per second.
  useEffect(() => {
    const id = window.setInterval(() => useHouse.getState().tickOnce(1), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Register WebMCP tools once; dispose unregisters when the app unmounts
  // (also keeps React StrictMode's double-mount from duplicating tools).
  useEffect(() => setupWebMcp().dispose, []);

  if (hash === '#learn') {
    return <LearnPage />;
  }

  return (
    <div className="app" id="drill">
      <Dashboard />
      {phase === 'idle' && <StartOverlay />}
      {phase === 'resolved' && <Debrief />}
      <ConfirmCard />
    </div>
  );
}

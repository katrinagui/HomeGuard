import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// WebMCP requires the page to run in an origin agent cluster; without this
// header registerTool() throws SecurityError (both native and polyfill).
const webmcpHeaders = { 'Origin-Agent-Cluster': '?1' };

export default defineConfig({
  plugins: [react()],
  server: { headers: webmcpHeaders },
  preview: { headers: webmcpHeaders },
});

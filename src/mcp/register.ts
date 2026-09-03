// Feature-detect and register the HomeGuard tools with the browser's model context.
// Order of preference (per the W3C draft and the webmcp skill):
//   1. document.modelContext  (Chrome 150+)
//   2. navigator.modelContext (Chrome 146–149 preview fallback)
//   3. @mcp-b/webmcp-polyfill (browsers without native support; demo mode)

import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';
import { useHouse } from '../store';
import { buildTools } from './tools';
import type { Msg } from '../i18n';

export interface WebMcpHandle {
  /** Unregisters every tool from this batch and stops pending status writes. */
  dispose(): void;
}

// The polyfill installs itself on the shared document context; installing it
// twice (React StrictMode remount) must not happen.
let polyfillInstalled = false;

export function setupWebMcp(): WebMcpHandle {
  const store = useHouse.getState();
  let disposed = false;
  const controller = new AbortController();
  const registeredNames: string[] = [];
  let resolvedContext: { registerTool(t: unknown, o?: unknown): unknown } | null = null;

  const setStatus = (status: Parameters<typeof store.setMcpStatus>[0], detail: string | Msg) => {
    // A stale registration pass (disposed batch) must never overwrite the
    // status written by the live one.
    if (!disposed) store.setMcpStatus(status, detail);
  };

  const run = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const native = (): any => (document as any).modelContext || (navigator as any).modelContext || null;

    let modelContext = native();

    if (!modelContext) {
      // Embedded webviews (IDE in-app browsers etc.) may not implement origin
      // agent clusters and report originAgentCluster === false even though the
      // Origin-Agent-Cluster header is served; the polyfill then refuses every
      // registration with SecurityError. Declare the cluster so the polyfill
      // proceeds. Native Chrome never reaches this branch — the browser itself
      // enforces agent clustering, no override needed or performed.
      if ((globalThis as Record<string, unknown>).originAgentCluster === false) {
        Object.defineProperty(globalThis, 'originAgentCluster', {
          value: true,
          configurable: true,
        });
        console.warn(
          '[HomeGuard] 此 webview 不支持 origin agent cluster，已为 polyfill 兼容声明开启。' +
            '生产部署请保留 Origin-Agent-Cluster: ?1 响应头。',
        );
      }
      if (!polyfillInstalled) {
        try {
          initializeWebMCPPolyfill();
          polyfillInstalled = true;
        } catch {
          // fall through to the unsupported branch
        }
      }
      modelContext = native();
    }

    // The polyfill exposes itself through document.modelContext too, so a
    // remount (React StrictMode) would see it as "native". The module flag
    // records who provided the context for this browser session.
    const isNative = !polyfillInstalled && Boolean(modelContext);

    if (!modelContext) {
      setStatus('unsupported', { key: 'mcp.detail.unsupported' });
      return;
    }
    resolvedContext = modelContext;

    const tools = buildTools();
    let registered = 0;

    for (const tool of tools) {
      if (disposed || controller.signal.aborted) return;
      try {
        // Chrome 151+ returns a Promise that resolves when the tool is visible
        // across the frame tree; older builds registered synchronously. Awaiting
        // inside try/catch handles both.
        await modelContext.registerTool(tool, { signal: controller.signal });
        registeredNames.push(tool.name);
        registered += 1;
      } catch (error) {
        console.error(`[HomeGuard] 注册工具 "${tool.name}" 失败:`, error);
        // Roll back the partial batch so the page never exposes half a tool set.
        for (const name of registeredNames.splice(0).reverse()) {
          try {
            modelContext.unregisterTool?.(name);
          } catch {
            // stale cleanup is harmless
          }
        }
        controller.abort();
        setStatus('error', `Tool "${tool.name}" failed to register: ${String(error)}`);
        return;
      }
    }

    if (disposed) return;

    // Debug/testing handle: lets test harnesses invoke tools the way an agent
    // would. It complements — never replaces — real model-context validation.
    (window as unknown as Record<string, unknown>).__homeguard = {
      modelContext,
      executeTool: async (name: string, input: Record<string, unknown>) => {
        const tool = tools.find((t) => t.name === name);
        if (!tool) throw new Error(`unknown tool: ${name}`);
        return tool.execute(input, { signal: new AbortController().signal });
      },
      tools: tools.map((t) => t.name),
    };

    setStatus(
      isNative ? 'ready' : 'polyfill',
      isNative
        ? `Native WebMCP connected. ${registered} tools registered.`
        : `WebMCP polyfill mode. ${registered} tools registered (demo).`,
    );
  };

  void run();

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      // Transitional: unregisterTool is removed in Chrome 148+; the signal abort
      // handles unregistration there. Call both for cross-version compatibility.
      if (resolvedContext) {
        for (const name of registeredNames.reverse()) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (resolvedContext as any).unregisterTool?.(name);
          } catch {
            // stale cleanup is harmless
          }
        }
      }
      controller.abort();
    },
  };
}

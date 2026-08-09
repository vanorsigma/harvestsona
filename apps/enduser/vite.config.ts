import { sveltekit } from '@sveltejs/kit/vite';
import path from 'node:path';
import { defineConfig, type ViteDevServer } from 'vite';
import { WebSocketServer } from 'ws';

function devWebSocket() {
  return {
    name: 'streamer-sync-dev-ws',
    configureServer(server: ViteDevServer) {
      const wss = new WebSocketServer({ noServer: true });
      server.httpServer?.on('upgrade', (req, socket, head) => {
        const { pathname } = new URL(req.url ?? '', 'http://localhost');
        if (pathname !== '/api/streamer/sync') return;

        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.clients.add(ws);
          ws.on('close', () => wss.clients.delete(ws));
        });
      });

      // slightly ugly methodology, we'll store it into globalThis
      globalThis.__wss = wss;
    }
  };
}

function cloudflareWorkersDevShim() {
  return {
    name: 'cloudflare-workers-dev-shim',
    enforce: 'pre' as const,
    resolveId(id: string) {
      if (id === 'cloudflare:workers') {
        return path.resolve('./src/lib/server/cloudflare-workers.shim.ts');
      }
    }
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    ...(command === 'serve' ? [cloudflareWorkersDevShim(), devWebSocket()] : []),
    sveltekit()
  ],
  optimizeDeps: {
    exclude: ['syncflare']
  },
  ssr: {
    noExternal: ['syncflare'],
    external: command === 'build' ? ['cloudflare:workers'] : []
  }
}));

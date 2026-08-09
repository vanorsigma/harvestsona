import { DevWebsocketProxy } from './dev';
import { ProdWebsocketProxy } from './prod';
import type { LogEntry } from 'syncflare';

let devWebSocket: DevWebsocketProxy | null = null;

export interface WebSocketServiceStub extends DurableObjectStub {
  broadcast(message: string | ArrayBuffer): Promise<void>;
}

export interface IWebSocketProxy {
  /**
   * Broacasts a message to all WebSocket connections.
   * @param {string | ArrayBuffer} message - The message to send to all WebSocket connections. Will send JSON.parse() version of all messages passed to this function
   */
  broadcastMessage(message: string | ArrayBuffer): Promise<void>;
}

export function getWebSocketProxy(platform: App.Platform): IWebSocketProxy | null {
  if (import.meta.env.DEV) {
    if (devWebSocket) return devWebSocket;
    if (!globalThis.__wss) return null;

    const ws = globalThis.__wss;
    const proxy = new DevWebsocketProxy(ws);
    devWebSocket = proxy;
    return proxy;
  } else {
    const ns = platform.env.WEBSOCKET_SERVICE;
    if (!ns) {
      console.error('[prod] WEBSOCKET_SERVICE binding is missing in getWebSocketProxy');
      return null;
    }
    console.log('[prod] WEBSOCKET_SERVICE binding confirmed in getWebSocketProxy');
    const stub = ns.get(ns.idFromName('sync'));
    return new ProdWebsocketProxy(stub as unknown as WebSocketServiceStub);
  }
}

export function serializeLogEntry(entry: LogEntry): string {
  return JSON.stringify({ type: 'log_entry', entry });
}

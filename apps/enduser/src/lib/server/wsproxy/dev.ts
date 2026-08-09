import type { IWebSocketProxy } from './proxy';
import type { WebSocketServer } from 'ws';

export class DevWebsocketProxy implements IWebSocketProxy {
  constructor(private server: WebSocketServer) {}

  async broadcastMessage(message: string | ArrayBuffer): Promise<void> {
    for (const client of this.server.clients) {
      client.send(message, { binary: message instanceof ArrayBuffer });
    }
  }
}

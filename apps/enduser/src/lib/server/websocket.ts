import { DurableObject } from 'cloudflare:workers';

export class WebSocketService extends DurableObject {
  async fetch(request: Request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      console.log('[ws-debug] In WebSocketService DO - upgrade header missing:', {
        upgrade: request.headers.get('Upgrade'),
        connection: request.headers.get('Connection'),
        'sec-websocket-version': request.headers.get('Sec-WebSocket-Version'),
        'sec-websocket-key': request.headers.get('Sec-WebSocket-Key'),
        url: request.url,
        method: request.method
      });
      return new Response('This is a WS endpoint.', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async broadcast(message: string | ArrayBuffer): Promise<void> {
    for (const client of this.ctx.getWebSockets()) {
      client.send(message);
    }
  }
}

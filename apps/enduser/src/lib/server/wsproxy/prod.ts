import type { IWebSocketProxy, WebSocketServiceStub } from './proxy';

export class ProdWebsocketProxy implements IWebSocketProxy {
  constructor(private stub: WebSocketServiceStub) {}

  async broadcastMessage(message: string | ArrayBuffer): Promise<void> {
    await this.stub.broadcast(message);
  }
}

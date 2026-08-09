import type { IClientBacking } from 'syncflare';
import { Channel, invoke } from '@tauri-apps/api/core';
import type { SyncflareLogger } from './TauriLogger';

export class ClientBacking implements IClientBacking {
  constructor(private logger: SyncflareLogger) {}

  async get(path: string | undefined): Promise<ReadableStream<Uint8Array> | null> {
    if (!path) return null;

    const channel = new Channel<ArrayBuffer>();
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    let endStatus: number | null = null;
    let resolveEnd: ((status: number) => void) | null = null;
    const endPromise = new Promise<number>((resolve) => {
      resolveEnd = resolve;
    });

    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      }
    });

    channel.onmessage = (msg: ArrayBuffer) => {
      const bytes = new Uint8Array(msg);
      if (bytes[0] === 0) {
        controller.enqueue(bytes.slice(1));
      } else if (bytes[0] === 1) {
        endStatus = bytes[1] | (bytes[2] << 8);
        if (endStatus === 200) {
          controller.close();
        } else {
          controller.error(new Error(`status ${endStatus}`));
        }
        resolveEnd!(endStatus);
      }
    };

    this.logger.info(`Trying to fetch ${path}`);
    try {
      await invoke('streamer_get', { path, channel });
    } catch (e) {
      this.logger.error(`Failed to stream ${path}: ${e}`);
      controller.error(e as Error);
      resolveEnd!(0);
      return null;
    }

    await endPromise;

    if (endStatus !== 200) {
      this.logger.error(`Resulted in error status ${endStatus}`);
      return null;
    }

    return stream;
  }
}

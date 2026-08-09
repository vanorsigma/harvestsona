import type { StorageProvider } from '@harvestsona/storage';
import type { IServerBacking } from 'syncflare';

export class SyncBacking implements IServerBacking {
  constructor(private storageProvider: StorageProvider) {}

  async get(path: string): Promise<ReadableStream<Uint8Array> | null> {
    return await this.storageProvider.getData(path);
  }

  async put(path: string, data: ReadableStream<Uint8Array>): Promise<void> {
    if (!(await this.storageProvider.upload(path, await new Response(data).blob())))
      throw new Error(`Upload via SyncBacking failed: ${path}`);
    return;
  }

  async delete(path: string): Promise<void> {
    await this.storageProvider.delete(path);
  }
}

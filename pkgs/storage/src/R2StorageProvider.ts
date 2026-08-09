import { type StorageProvider } from "./StorageProvider";
import type { R2Bucket } from "@cloudflare/workers-types";
import { Blob } from "@cloudflare/workers-types";

export class R2StorageProvider implements StorageProvider {
  constructor(private bucket: R2Bucket) {}

  async upload(
    filename: string,
    file: File | globalThis.Blob,
  ): Promise<boolean> {
    try {
      await this.bucket.put(filename, file as unknown as Blob);
      return true;
    } catch (error) {
      console.error("Upload failed", error);
      return false;
    }
  }

  async delete(filename: string): Promise<void> {
    try {
      const fileObj = await this.bucket.get(filename);
      if (fileObj) {
        await this.bucket.delete(fileObj.key);
      }
    } catch (error) {
      console.error("Delete failed", error);
      return;
    }
  }

  async getData(filename: string): Promise<globalThis.ReadableStream | null> {
    const fileObj = await this.bucket.get(filename);
    return (fileObj?.body as unknown as globalThis.ReadableStream) ?? null;
  }
}

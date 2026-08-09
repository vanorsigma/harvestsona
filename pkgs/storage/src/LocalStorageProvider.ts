import type { StorageProvider } from "./StorageProvider";

export class LocalStorageProvider implements StorageProvider {
    upload(filename: string, file: File | Blob): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    getData(filename: string): Promise<ReadableStream | null> {
        throw new Error("Method not implemented.");
    }
    delete(filename: string): Promise<void> {
      throw new Error("Method not implemented.");
    }
}

export class StorageProviderError extends Error {};
export class MissingResourceError extends StorageProviderError {};

export interface StorageProvider {
  upload(filename: string, file: File | Blob): Promise<boolean>;
  delete(filename: string): Promise<void>;
  getData(filename: string): Promise<ReadableStream | null>;
}

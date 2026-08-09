import { dev } from '$app/environment';
import { MAX_HARVESTSONA_SIZE } from '@harvestsona/shared';
import { hashStream } from 'syncflare';
import { fileTypeFromBuffer } from 'file-type';
import { makeCanonicalStorageProvider } from './uploadHarvestsona';
import { getWebSocketProxy, serializeLogEntry } from './wsproxy/proxy';

export interface ApplyReplacementResult {
  filename: string;
  previousFilename: string | null;
  hash: string;
}

export async function applyHarvestsonaReplacement(
  locals: App.Locals,
  platform: App.Platform,
  target: { uid: string; username: string },
  file: File
): Promise<ApplyReplacementResult> {
  if (file.size === 0) throw new Error('file_data_missing');
  if (file.size > MAX_HARVESTSONA_SIZE) throw new Error('file_data_too_big');

  const sniffBytes = await file.slice(0, 4100).arrayBuffer();
  const detected = await fileTypeFromBuffer(new Uint8Array(sniffBytes));
  if (!detected || detected.mime !== file.type) throw new Error('mime_mismatch');

  const provider = makeCanonicalStorageProvider(platform);

  const existing = await locals.repositories?.harvestsonas?.getHarvestsona(target);
  const previousFilename = existing?.currentFilename ?? null;

  const filename = crypto.randomUUID().toString();
  if (!(await provider.upload(filename, file))) throw new Error('upload_failed');

  const hash = await hashStream(file.stream());

  await locals.repositories?.harvestsona?.createHarvestsona(
    { uid: target.uid, username: target.username },
    filename,
    hash,
    new Date()
  );

  if (previousFilename) {
    await provider.delete(previousFilename);
  }

  const syncdb = locals.sync?.db;
  const ws = getWebSocketProxy(platform);
  if (syncdb) {
    const entry = await syncdb.append('CREATE', filename, hash, Date.now());
    void (await ws?.broadcastMessage(serializeLogEntry(entry)));
    if (previousFilename) {
      const delEntry = await syncdb.append('DELETE', previousFilename, '', Date.now());
      void (await ws?.broadcastMessage(serializeLogEntry(delEntry)));
    }
  }

  return { filename, previousFilename, hash };
}

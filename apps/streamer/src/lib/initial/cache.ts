import { load } from '@tauri-apps/plugin-store';
import { debug, info } from '@tauri-apps/plugin-log';
import type { UploadEntry } from './index.js';

const STORE_FILE = 'config.json';
const CACHE_KEY = 'pending_sync_entries';

export async function savePendingSyncEntries(entries: UploadEntry[]): Promise<void> {
  info(`Saving ${entries.length} pending sync entries to cache (key: ${CACHE_KEY})`);
  debug(`Cached entries: ${JSON.stringify(entries.map((e) => e.username))}`);
  const store = await load(STORE_FILE);
  await store.set(CACHE_KEY, entries);
  await store.save();
}

export async function loadPendingSyncEntries(): Promise<UploadEntry[] | null> {
  const store = await load(STORE_FILE);
  const entries = await store.get<UploadEntry[]>(CACHE_KEY);
  if (entries && entries.length > 0) {
    info(`Loaded ${entries.length} pending sync entries from cache`);
    debug(`Loaded cached entries: ${JSON.stringify(entries.map((e) => e.username))}`);
  } else {
    debug(`No pending sync entries found in cache (key: ${CACHE_KEY})`);
  }
  return entries ?? null;
}

export async function clearPendingSyncEntries(): Promise<void> {
  info('Clearing pending sync entries from cache');
  const store = await load(STORE_FILE);
  await store.set(CACHE_KEY, null);
  await store.save();
}

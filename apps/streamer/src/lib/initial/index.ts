import { Channel, invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { debug, error as logError, info } from '@tauri-apps/plugin-log';

export interface UploadEntry {
  username: string;
  local_path: string;
}

export interface ProgressUpdate {
  progress: number;
  total: number;
}

export type ProgressCallback = (update: ProgressUpdate) => void;

export async function selectDirectory(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false
  });
  const result = selected ? (Array.isArray(selected) ? selected[0] : selected) : null;
  debug(`selectDirectory returned: ${result ?? 'null'}`);
  return result;
}

export async function collectUploadEntriesFromDirectory(dirPath: string): Promise<UploadEntry[]> {
  info(`Scanning directory: ${dirPath}`);
  const entries = await invoke<{ username: string; local_path: string }[]>(
    'scan_directory_for_images',
    { dirPath }
  );
  const result = entries.map((e) => {
    const mapped = { username: e.username.toLowerCase(), local_path: e.local_path };
    debug(`collectUploadEntries: mapping username=${mapped.username} -> path=${mapped.local_path}`);
    return mapped;
  });
  info(`Found ${result.length} image(s) in directory`);
  debug(`Scan results: ${JSON.stringify(result.map((e) => e.username))}`);
  return result;
}

export async function pushInitial(
  entries: UploadEntry[],
  onProgress?: ProgressCallback
): Promise<ProgressUpdate[]> {
  info(`pushInitial starting with ${entries.length} entries`);
  const channel = new Channel<ArrayBuffer>();
  const progressUpdates: ProgressUpdate[] = [];
  channel.onmessage = (msg) => {
    const text = new TextDecoder().decode(msg);
    const update = JSON.parse(text) as ProgressUpdate;
    debug(`Progress update received: progress=${update.progress}, total=${update.total}`);
    progressUpdates.push(update);
    onProgress?.(update);
  };
  try {
    await invoke('streamer_initial_sync_post', { entries, channel });
    info(`pushInitial completed. ${progressUpdates.length} progress updates received.`);
  } catch (e) {
    logError(`pushInitial failed: ${e}`);
    throw e;
  }
  return progressUpdates;
}

export async function runInitialSync(
  entries: UploadEntry[],
  onProgress?: ProgressCallback
): Promise<ProgressUpdate[]> {
  info(`runInitialSync called with ${entries.length} entries`);
  const result = await pushInitial(entries, onProgress);
  info(`runInitialSync finished with ${result.length} progress updates`);
  return result;
}

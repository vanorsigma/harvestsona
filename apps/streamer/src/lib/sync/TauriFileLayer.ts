import type { FileEvent, IFileLayer } from 'syncflare';
import { hashBuffer, normalizePath, joinAndNormalize } from 'syncflare';
import {
  BaseDirectory,
  readDir,
  readFile,
  writeFile,
  remove,
  mkdir,
  stat,
  watch
} from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';
import type { UnwatchFn, WatchEvent } from '@tauri-apps/plugin-fs';
import type { SyncflareLogger } from './TauriLogger';

const BASE_REL = 'harvestsonas';

function baseRel(path: string): string {
  return joinAndNormalize(BASE_REL, path);
}

function watchEventToFileEvent(event: WatchEvent): FileEvent | null {
  const t = event.type;
  if (typeof t === 'string') {
    if (t === 'any') {
      const p = event.paths[0];
      return p ? { type: 'change', path: p } : null;
    }
    return null;
  }

  if ('create' in t) {
    const kind = (t.create as { kind?: string }).kind;
    if (kind === 'file' || kind === 'any' || kind === undefined) {
      const p = event.paths[0];
      return p ? { type: 'add', path: p } : null;
    }
  }
  if ('remove' in t) {
    const kind = (t.remove as { kind?: string }).kind;
    if (kind === 'file' || kind === 'any' || kind === undefined) {
      const p = event.paths[0];
      return p ? { type: 'unlink', path: p } : null;
    }
  }
  if ('modify' in t) {
    const kind = (t.modify as { kind?: string }).kind;
    if (kind === 'data' || kind === 'any') {
      const p = event.paths[0];
      return p ? { type: 'change', path: p } : null;
    }
  }

  return null;
}

export class TauriFileLayer implements IFileLayer {
  constructor(private logger: SyncflareLogger) {}

  private eventHandler: ((event: FileEvent) => void) | null = null;
  private unwatch: UnwatchFn | null = null;
  private baseAbs: string | null = null;

  private suppressPaths = new Map<string, number>();

  onEvent(handler: (event: FileEvent) => void): void {
    this.eventHandler = handler;
  }

  async startWatch(): Promise<void> {
    const appData = await appDataDir();
    this.baseAbs = joinAndNormalize(appData, BASE_REL);

    this.unwatch = await watch(
      BASE_REL,
      (event) => {
        const now = Date.now();
        for (const rawPath of event.paths) {
          const rel = this.toRelative(rawPath);
          if (!rel) continue;
          const until = this.suppressPaths.get(rel);
          if (until && until > now) {
            this.suppressPaths.delete(rel);
            continue;
          }
          const fileEvent = watchEventToFileEvent({ ...event, paths: [rel] });
          if (fileEvent) this.eventHandler?.(fileEvent);
        }
      },
      { recursive: true, baseDir: BaseDirectory.AppData, delayMs: 200 }
    );
  }

  async stopWatch(): Promise<void> {
    if (this.unwatch) {
      this.unwatch();
      this.unwatch = null;
    }
  }

  async scanAllFiles(
    knownEntries?: Map<string, { hash: string; mtime: number }>
  ): Promise<Map<string, { hash: string; mtime: number }>> {
    const result = new Map<string, { hash: string; mtime: number }>();
    await this.scanDir('', result, knownEntries);
    this.logger.error(`Captured ${result.size} paths in scanAllFiles: ${[...result.keys()]}`);
    return result;
  }

  private async scanDir(
    relDir: string,
    acc: Map<string, { hash: string; mtime: number }>,
    known?: Map<string, { hash: string; mtime: number }>
  ): Promise<void> {
    let entries: { name: string; isFile: boolean; isDirectory: boolean }[];
    try {
      const baseRelDir = baseRel(relDir);
      await mkdir(baseRelDir, { recursive: true, baseDir: BaseDirectory.AppData });
      entries = await readDir(baseRelDir, { baseDir: BaseDirectory.AppData });
    } catch (e) {
      this.logger.error(`Cannot read the directory: ${e}`);
      return;
    }

    for (const entry of entries) {
      const relPath = normalizePath(relDir ? `${relDir}/${entry.name}` : entry.name);

      if (entry.isDirectory) {
        await this.scanDir(relPath, acc, known);
      } else if (entry.isFile) {
        const knownEntry = known?.get(relPath);
        let mtime: number;
        try {
          const info = await stat(baseRel(relPath), { baseDir: BaseDirectory.AppData });
          mtime = info.mtime?.getTime() ?? 0;
        } catch {
          continue;
        }

        if (knownEntry && knownEntry.mtime === mtime) {
          acc.set(relPath, { hash: knownEntry.hash, mtime });
        } else {
          try {
            const data = await readFile(baseRel(relPath), { baseDir: BaseDirectory.AppData });
            const hash = await hashBuffer(data);
            acc.set(relPath, { hash, mtime });
          } catch {
            continue;
          }
        }
      }
    }
  }

  async readFile(path: string): Promise<ReadableStream<Uint8Array> | null> {
    try {
      const data = await readFile(baseRel(path), { baseDir: BaseDirectory.AppData });
      return new ReadableStream({
        start(controller) {
          controller.enqueue(data);
          controller.close();
        }
      });
    } catch {
      return null;
    }
  }

  async writeFile(path: string, stream: ReadableStream<Uint8Array>): Promise<void> {
    const rel = baseRel(path);
    const slashIdx = rel.lastIndexOf('/');
    this.logger.debug(`Attempting to write to path: ${path}`);
    if (slashIdx > 0) {
      const parent = rel.slice(0, slashIdx);
      await mkdir(parent, { recursive: true, baseDir: BaseDirectory.AppData }).catch(() => {});
    }
    await writeFile(rel, stream, { baseDir: BaseDirectory.AppData });
    this.suppressPaths.set(normalizePath(path), Date.now() + 500);
    this.logger.debug(`Written to ${rel} in the file system`);
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await remove(baseRel(path), { baseDir: BaseDirectory.AppData });
      this.logger.debug(`Deleted path ${path} from the file system`);
    } catch {
      // file might already be gone
    }
    this.suppressPaths.set(normalizePath(path), Date.now() + 500);
  }

  async getMtime(path: string): Promise<number | null> {
    try {
      const info = await stat(baseRel(path), { baseDir: BaseDirectory.AppData });
      return info.mtime?.getTime() ?? null;
    } catch {
      return null;
    }
  }

  private toRelative(absPath: string): string | null {
    if (!this.baseAbs) return null;
    const normalized = absPath.replace(/\\/g, '/');

    if (normalized.startsWith(this.baseAbs + '/')) {
      return normalizePath(normalized.slice(this.baseAbs.length + 1));
    }
    if (normalized === this.baseAbs) {
      return '';
    }

    if (normalized.startsWith(BASE_REL + '/')) {
      return normalizePath(normalized.slice(BASE_REL.length + 1));
    }
    if (normalized === BASE_REL) {
      return '';
    }

    return normalizePath(normalized);
  }
}
